import * as pulumi from "@pulumi/pulumi";
import * as coreweave from "@pulumi/coreweave";
import * as k8s from "@pulumi/kubernetes";
import * as gpuTypes from "./gpuTypes";
import { waitForApiServer } from "./apiServer";
import { clusterKubeconfig } from "./kubeconfig";
import { llamaModelDeployment } from "./llama-deployment";
const config = new pulumi.Config();

// network configuration with defaults
const internalLbCidr = config.get("internalLbCidr") || "10.16.4.0/22";
const podCidr = config.get("podCidr") || "10.0.0.0/13";
const serviceCidr = config.get("serviceCidr") || "10.16.0.0/22";
const zone = config.get("zone") || "US-WEST-01A";

// the same token used to authenticate the coreweave provider, reused below
// to authenticate to the cluster's api-server and construct the kubeconfig.
const token = new pulumi.Config("coreweave").requireSecret("token");

// create the kubernetes cluster and its vpc with defaults
const defaultVpc = new coreweave.NetworkingVpc("cluster-vpc", {
    zone: zone,
    vpcPrefixes: [
        { name: "internal-lb-cidr", value: internalLbCidr },
        { name: "pod-cidr", value: podCidr },
        { name: "service-cidr", value: serviceCidr }
    ]
});

const cluster = new coreweave.CksCluster("my-cluster", {
    vpcId: defaultVpc.id,
    zone: defaultVpc.zone,
    version: "v1.36",
    public: true,
    podCidrName: "pod-cidr",
    serviceCidrName: "service-cidr",
    internalLbCidrNames: ["internal-lb-cidr"],
});

export const clusterId = cluster.id;
export const clusterName = cluster.name;
export const vpcId = defaultVpc.id;

// Gate the kubeconfig on api-server readiness so the k8s provider does not race ahead of DNS propagation or api-server startup.
const apiServerEndpoint = pulumi.all([cluster.apiServerEndpoint, token]).apply(async ([endpoint, tok]) => {
    if (pulumi.runtime.isDryRun()) {
        return endpoint;
    }
    const twentyMinutesFromNow = Date.now() + 20 * 60 * 1000;
    await waitForApiServer(endpoint, tok, twentyMinutesFromNow);
    return endpoint;
});

export const kubeconfig = clusterKubeconfig(clusterName, apiServerEndpoint, token);

const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: kubeconfig,
});

// Create a node pool within the cluster with a single RTX Pro 6000 GPU instance. 
const nodePool = new k8s.apiextensions.CustomResource("nodepool", {
    apiVersion: "compute.coreweave.com/v1alpha1",
    kind: "NodePool",
    metadata: {
        name: "my-pulumi-nodepool",
    },
    spec: {
        autoscaling: false,
        instanceType: gpuTypes.RTX_PRO_6000,
        targetNodes: 1,
        nodeConfigurationUpdateStrategy: { type: "OnSpecUpdate" },
    },
}, {
    provider: k8sProvider,
});

const huggingFaceToken = config.requireSecret("huggingfaceToken")

export const llamaWebServiceId = llamaModelDeployment(k8sProvider, huggingFaceToken);



