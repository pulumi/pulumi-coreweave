# CoreWeave with Pulumi example program

This is an example program that demonstrates how to use the CoreWeave provider with Pulumi to create and manage resources on the CoreWeave platform.

## Prerequisites
  - A CoreWeave account and API token
  - Pulumi CLI installed
  - Node.js installed

### Description
The program provisions a networking VPC, a CKS cluster within that VPC, and a CPU node pool on the cluster in a single deployment. The kubeconfig used to talk to the cluster is assembled in-program from the cluster's `apiServerEndpoint` output and the same CoreWeave token used to authenticate the provider, so no manual kubeconfig download is required.

### Setting up credentials
Make sure you have a CoreWeave API token, which you can get from the CoreWeave console. You can set this as a configuration value for your Pulumi program as follows.

First initialize a new Pulumi stack:
```
pulumi stack init dev
```
Then add the token to your config:
```
pulumi config set coreweave:token <your_api_token> --secret
```

The program reads `coreweave:token` to authenticate both the CoreWeave provider and the Kubernetes provider it builds for the cluster.

### Deploying

Make sure the package dependencies are installed:
```
pulumi install
```
This will install the required program dependencies as well as the provider plugins for CoreWeave and Kubernetes.

Run preview to see what resources will be created:
```bash
pulumi preview
```
You should see something like this:
```
     Type                                                   Name          Plan
 +   pulumi:pulumi:Stack                                    <stack-name>  create
 +   ├─ pulumi:providers:coreweave                          coreweave     create
 +   ├─ coreweave:index:NetworkingVpc                       cluster-vpc   create
 +   ├─ coreweave:index:CksCluster                          my-cluster    create
 +   ├─ pulumi:providers:kubernetes                         k8s-provider  create
 +   └─ kubernetes:compute.coreweave.com/v1alpha1:NodePool  nodepool      create

Resources:
    + 6 to create
```
If everything looks good, you can proceed to deploy the resources:
```bash
pulumi up
```
This will prompt you to confirm the deployment. Type `yes` to proceed. Once the deployment is complete, you will see the outputs which include the `clusterId`, `clusterName`, and `vpcId`.

The program will create a CPU node pool with one node. Make sure your account has quota for the instance type that is being used. You can change the instance type in `index.ts`. Note that the node won't be available right away; it will be queued for provisioning and become available after a while. You can check the status in the CoreWeave console.

### Teardown

Run `pulumi destroy` to tear down all the resources created by this program. It is better to delete the cluster only after the node pools have actually been provisioned.
