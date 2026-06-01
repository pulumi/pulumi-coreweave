### Deploying an Open-Source LLM on CoreWeave with Hugging Face and Pulumi

This example demonstrates how to deploy an open-source large language model (LLM) on CoreWeave. It provisions Meta’s Llama 3.1 model from HuggingFace on CKS with cluster and Node Pool setup in one go using Pulumi.

## Prerequisites
  - A CoreWeave account and API token
  - Pulumi CLI installed
  - Node.js installed
  - A HuggingFace Access Token used to download the Llama 3.1 model. You can get this from your HuggingFace account settings. Use a Read-only token, no need for write permissions.
  - Access to the Llama 3.1 model on HuggingFace. Make sure you have accepted the terms and conditions for the model in order to access it [here](https://huggingface.co/meta-llama/Llama-3.1-8B).

Once you have requested access to the model, you will see this message:
> Your request to access this repository has been submitted and is awaiting a review from the repository authors. You can check the status of all your access requests in your [settings](https://huggingface.co/settings/gated-repos).

Make sure your request has been approved before proceeding with the deployment.

### Setting up credentials

To deploy the program, we will need access to CoreWeave and HuggingFace via their respective API tokens. Initialize these as secrets in a new Pulumi stack as follows:
```
pulumi stack init hf-dev
pulumi config set coreweave:token <your_coreweave_api_token> --secret
pulumi config set huggingfaceToken <your_huggingface_api_token> --secret
```
The first token is to setup the CoreWeave provider while the second will be used in the program to download the Llama 3.1 model from HuggingFace and serve it on the cluster.

Once you have setup the credentials, you should be able to run `pulumi preview` to see which resources will be provisioned. You should see something as follows:
```bash
     Type                                                   Name                     Plan       
 +   pulumi:pulumi:Stack                                    <projectName-stackName>  create     
 +   ├─ coreweave:index:NetworkingVpc                       cluster-vpc              create     
 +   ├─ coreweave:index:CksCluster                          my-cluster               create     
 +   ├─ pulumi:providers:kubernetes                         k8s-provider             create     
 +   ├─ kubernetes:compute.coreweave.com/v1alpha1:NodePool  nodepool                 create     
 +   ├─ kubernetes:apps/v1:Deployment                       llama-3-1-8b-deployment  create     
 +   ├─ kubernetes:core/v1:Service                          llama-3-1-8b-svc         create     
 +   ├─ kubernetes:apps/v1:Deployment                       open-webui               create     
 +   └─ kubernetes:core/v1:Service                          open-webui-svc           create     

Policies:
    ✅ pulumi-internal-policies@v0.0.7

Outputs:
    clusterId  : [unknown]
    clusterName: "my-cluster-3a378c9"
    llamaWebServiceId : [unknown]
    kubeconfig : [unknown]
    vpcId      : [unknown]

Resources:
    + 9 to create
```

### Deploying the cluster and the model

When you are ready, run `pulumi up` to deploy the cluster and the model. This will take around 20-40 minutes to complete as it needs to provision the cluster and download the model. 

The program awaits the API server to be up and running before deploying the model, so you will see some outputs in the terminal indicating the progress. In case of timeouts, simply re-run `pulumi up` and it will continue from where it left off because it won't need to reprovision the cluster, just waiting for it to be ready.

if everything goes well, you should see an output with the endpoint to access the model's UI and the kubeconfig to access the cluster:
```bash
Outputs:
    clusterId        : "<cluster_id>"
    clusterName      : "my-cluster-<suffix>"
    kubeconfig       : [secret]
    llamaWebServiceId: "default/open-webui-svc"
    vpcId            : "<vpc_id>"
```

### What did we do?

Initially, we provisioned a CKS cluster, then waited until its API server was ready to accept deployments. Once the cluster was ready, we derived the kubeconfig from the cluster and token credentials so that we could connect to the cluster dynamically via the Pulumi Kubernetes provider and deploy the Llama 3.1 model on it. The model is served via vLLM and we used Open-WebUI as a lightweight interface to interact with the model.

### Accessing the chat interface with the deployed model

To access the Open-WebUI interface for interacting with the Llama 3.1 model, you can port-forward the service to your local machine using kubectl. Run the following commands in your terminal. First we will extract the kubeconfig from the stack output and save it to a file, then we will use that kubeconfig to port-forward the Open-WebUI service to our local machine:

```bash
pulumi stack output kubeconfig --show-secrets > ./kubeconfig.yaml
kubectl --kubeconfig ./kubeconfig.yaml port-forward service/open-webui-svc 8080:80
```

Now the user interface should be accessible at `http://localhost:8080` in your web browser. You can start chatting with the Llama 3.1 model through this interface.