# CoreWeave with Pulumi example program

This is an example program that demonstrates how to use the CoreWeave provider with Pulumi to create and manage resources on the CoreWeave platform.

## Prerequisites
  - A CoreWeave account and API token
  - Pulumi CLI installed
  - Node.js installed

### Description
The Pulumi program here works in two phases. The first phase sets up the networking VPC and the cluster within that VPC.

Once the cluster is deployed. The second phase starts where we will need to download the `kubeconfig` of the cluster for the second phase in order to be able to connect to the cluster and deploy node pools within it. 

### Setting up credentials
Make you are have a CoreWeave API token which you can get from the CoreWeave console. You can set this as a configuration for your Pulumi program as follows.

First initialize a new Pulumi stack:
```
pulumi stack init dev
```
Then add the token to your config:
```
pulumi config set coreweave:token <your_api_token> --secret
```


### Phase 1: deploying the cluster

Make sure the package dependencies are installed:
```
pulumi install
```
This will install the required program dependencies as well as any required Pulumi plugins such the provider plugin for CoreWeave and the kubernetes provider.

Run preview to see what resources will be created
```bash
pulumi preview
```
You should see something like this:
```
     Type                              Name         Plan       
 +   pulumi:pulumi:Stack               <stack-name>        create     
 +   ├─ pulumi:providers:coreweave     coreweave    create     
 +   ├─ coreweave:index:NetworkingVpc  cluster-vpc  create     
 +   └─ coreweave:index:CksCluster     my-cluster   create     

Outputs:
    clusterId  : [unknown]
    clusterName: "my-cluster-0607e23"
    vpcId      : [unknown]

Resources:
    + 4 to create
```
If everything looks good, you can proceed to deploy the resources:
```bash
pulumi up
```
This will prompt you to confirm the deployment. Type `yes` to proceed. Once the deployment is complete, you will see the outputs which include the `clusterId`, `clusterName`, and `vpcId`.

### Phase 2: deploying node pools

Before being able to deploy node pools, you will need to download the `kubeconfig` for the cluster that was created in phase 1 from the console and add it as a file in this directory called `kubeconfig.yaml`. This file name is git-ignored and should not be committed to version control.

Next time you run the program, it will detect the `kubeconfig.yaml` file and will use it to connect to the cluster and deploy the node pools within it.

The program will create a CPU Node Pool with one node. Make sure your account has quota for the instance type that is being used in the node pool. You can change the instance type in the `index.ts` file if needed.

Run the preview again to see the changes that will be made:
```bash
pulumi preview
```
You should see something like this:
```
     Type                                                   Name          Plan       
     pulumi:pulumi:Stack                                    <stack-name>           update         
 +   ├─ pulumi:providers:kubernetes                         k8s-provider  create     
 +   └─ kubernetes:compute.coreweave.com/v1alpha1:NodePool  nodepool      create     

Resources:
    + 2 to create
```
If everything looks good, you can proceed to deploy the resources:
```bash
pulumi up
```
This will prompt you to confirm the deployment. Type `yes` to proceed. Once the deployment.

This will now deploy the node pool to the cluster with a single node in it. Note that the node won't be available right away, instead it will be queued for provisioning and will be available after a while. You can check the status of the node pool in the CoreWeave console. Once the node is available, you can use it to run your workloads on the cluster.

### Teardown

Simply run `pulumi destroy` to tear down all the resources that were created by this program. It is better to delete the cluster only after the node pools have been actually been provisioned.