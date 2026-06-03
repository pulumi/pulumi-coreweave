import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// creates a deployment of the HuggingFace LLaMA-3.1 model
// Exposes a conversational UI via Open-WebUI, which connects to the model via the OpenAI API spec.
export function llamaModelDeployment(
    provider: k8s.Provider,
    huggingFaceToken: pulumi.Output<string>,
): pulumi.Output<string> {

    const llamaDeployment = new k8s.apps.v1.Deployment("llama-3-1-8b-deployment", {
        metadata: { name: "llama-3-1-8b-deployment" },
        spec: {
            replicas: 1,
            selector: { matchLabels: { app: "llama-3-1-8b-server" } },
            template: {
                metadata: { labels: { app: "llama-3-1-8b-server" } },
                spec: {
                    restartPolicy: "Always",
                    volumes: [{
                        name: "dshm",
                        emptyDir: { medium: "Memory", sizeLimit: "2Gi" },
                    }],
                    containers: [{
                        name: "vllm-server",
                        image: "ghcr.io/coreweave/ml-containers/vllm-tensorizer:es-fa3-te-update-f67f9ec-v0.9.2",
                        command: ["/bin/bash", "-c"],
                        args: [
                            "vllm serve $MODEL --host 0.0.0.0 --port 8000 --tensor-parallel-size $TENSOR_PARALLEL_SIZE",
                        ],
                        env: [
                            { name: "MODEL", value: "meta-llama/Llama-3.1-8B-Instruct" },
                            { name: "TENSOR_PARALLEL_SIZE", value: "1" },
                            {
                                name: "HF_TOKEN",
                                value: huggingFaceToken,
                            },
                        ],
                        ports: [{ containerPort: 8000 }],
                        volumeMounts: [{ name: "dshm", mountPath: "/dev/shm" }],
                        resources: {
                            requests: { "nvidia.com/gpu": "1" },
                            limits: { "nvidia.com/gpu": "1" },
                        },
                    }],
                },
            },
        },
    }, { provider });

    const llamaService = new k8s.core.v1.Service("llama-3-1-8b-svc", {
        metadata: { name: "llama-3-1-8b-svc" },
        spec: {
            selector: { app: "llama-3-1-8b-server" },
            ports: [{ protocol: "TCP", port: 11434, targetPort: 8000 }],
        },
    }, { provider, dependsOn: llamaDeployment });

    const openWebUiDeployment = new k8s.apps.v1.Deployment("open-webui", {
        metadata: { name: "open-webui" },
        spec: {
            replicas: 1,
            selector: { matchLabels: { app: "open-webui" } },
            template: {
                metadata: { labels: { app: "open-webui" } },
                spec: {
                    volumes: [{ name: "open-webui-storage", emptyDir: {} }],
                    containers: [{
                        name: "open-webui",
                        image: "ghcr.io/open-webui/open-webui:v0.6.5",
                        ports: [{ containerPort: 8080 }],
                        env: [
                            { name: "WEBUI_AUTH", value: "false" },
                            { name: "ENABLE_SIGNUP", value: "true" },
                            { name: "ENABLE_LOGIN_FORM", value: "true" },
                            { name: "OPENAI_API_BASE_URL", value: "http://llama-3-1-8b-svc:11434/v1" },
                            { name: "OPENAI_API_KEY", value: "not-needed" },
                        ],
                        volumeMounts: [{ name: "open-webui-storage", mountPath: "/app/backend/data" }],
                    }],
                },
            },
        },
    }, { provider, dependsOn: llamaService });

    const openWebUiService = new k8s.core.v1.Service("open-webui-svc", {
        metadata: { 
            name: "open-webui-svc"
        },
        spec: {
            type: "ClusterIP",
            selector: { app: "open-webui" },
            ports: [{ protocol: "TCP", port: 80, targetPort: 8080 }],
        },
    }, { provider, dependsOn: openWebUiDeployment });

    return openWebUiService.id
}