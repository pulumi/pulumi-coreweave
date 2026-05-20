import * as pulumi from "@pulumi/pulumi";
import * as coreweave from "@pulumi/coreweave";
import * as k8s from "@pulumi/kubernetes";
import * as cpuTypes from "./cpuTypes";
import { waitForApiServer } from "./apiServer";

const config = new pulumi.Config();
// network configuration with defaults
const internalLbCidr = config.get("internalLbCidr") || "10.16.4.0/22";
const podCidr = config.get("podCidr") || "10.0.0.0/13";
const serviceCidr = config.get("serviceCidr") || "10.16.0.0/22";
const zone = config.get("zone") || "US-WEST-04A";

// the same token used to authenticate the coreweave provider, reused below
// to authenticate to the cluster's api-server.
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
    version: "v1.35",
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
    await waitForApiServer(endpoint, tok, Date.now() + 10 * 60 * 1000);
    return endpoint;
});

const kubeconfig = pulumi.interpolate`apiVersion: v1
kind: Config
preferences: {}
clusters:
- name: ${cluster.name}
  cluster:
    server: https://${apiServerEndpoint}
contexts:
- name: ${cluster.name}
  context:
    cluster: ${cluster.name}
    user: coreweave
current-context: ${cluster.name}
users:
- name: coreweave
  user:
    token: ${token}
`;

const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: kubeconfig,
});

const nodePool = new k8s.apiextensions.CustomResource("nodepool", {
    apiVersion: "compute.coreweave.com/v1alpha1",
    kind: "NodePool",
    metadata: {
        name: "my-pulumi-nodepool",
    },
    spec: {
        autoscaling: false,
        instanceType: cpuTypes.GeneralPurpose_Intel_EmeraldRapid,
        targetNodes: 1,
        nodeConfigurationUpdateStrategy: { type: "OnSpecUpdate" },
    },
}, {
    provider: k8sProvider,
});
