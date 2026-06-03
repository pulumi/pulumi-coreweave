import * as pulumi from "@pulumi/pulumi";

export function clusterKubeconfig(
    clusterName: pulumi.Output<string>,
    endpoint: pulumi.Output<string>, 
    token: pulumi.Output<string>): pulumi.Output<string> {

    return pulumi.interpolate`apiVersion: v1
kind: Config
preferences: {}
clusters:
- name: ${clusterName}
  cluster:
    server: https://${endpoint}
contexts:
- name: ${clusterName}
  context:
    cluster: ${clusterName}
    user: coreweave
current-context: ${clusterName}
users:
- name: coreweave
  user:
    token: ${token}
`;
}