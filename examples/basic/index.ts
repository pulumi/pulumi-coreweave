import * as pulumi from "@pulumi/pulumi";
import * as coreweave from "@pulumi/coreweave";
import * as k8s from "@pulumi/kubernetes";
import { existsSync, readFileSync } from "fs";
import * as cpuTypes from "./cpuTypes";


const config = new pulumi.Config();
// network configuration with defaults
const internalLbCidr = config.get("internalLbCidr") || "10.16.4.0/22";
const podCidr = config.get("podCidr") || "10.0.0.0/13";
const serviceCidr = config.get("serviceCidr") || "10.16.0.0/22";
const zone = config.get("zone") || "US-WEST-04A";

// phase 1: create the kubernetes cluster and its vpc with defaults
const defaultVpc = new coreweave.NetworkingVpc("cluster-vpc", {
    zone: zone,
    vpcPrefixes: [
        { name: "internal-lb-cidr", value: internalLbCidr },
        { name: "pod-cidr",  value: podCidr },
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

if (existsSync("kubeconfig.yaml")) {
    // phase 2: connect to the kubernetes cluster and deploy node pools
    // acquire the kubeconfig from the console and 
    // save it as kubeconfig.yaml in this directory
    const kubeconfig = readFileSync("kubeconfig.yaml", "utf-8");
    const k8sProvider = new k8s.Provider("k8s-provider", {
        kubeconfig: pulumi.secret(kubeconfig),
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
        dependsOn: [cluster],
    });
}