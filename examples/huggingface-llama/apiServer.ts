import * as https from "https";
import * as pulumi from "@pulumi/pulumi";

// waitForApiServer polls the cluster's API server until its schema is available.
export async function waitForApiServer(endpoint: string, token: string, deadline: number): Promise<void> {
    const url = `https://${endpoint}/openapi/v2`;
    pulumi.log.info(`waiting for api-server at ${url} to return 200`);

    let lastError: string | undefined;
    while (Date.now() < deadline) {
        try {
            const status = await new Promise<number>((resolve, reject) => {
                const req = https.request(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    // The API server uses a self-signed certificate; we only care about liveness here.
                    rejectUnauthorized: false,
                    timeout: 10000,
                }, (res) => {
                    res.resume();
                    resolve(res.statusCode ?? 0);
                });
                req.on("error", reject);
                req.on("timeout", () => req.destroy(new Error("timeout")));
                req.end();
            });
            if (status === 200) {
                return;
            }
            lastError = `HTTP ${status}`;
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
        }
        await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error(`api server at ${endpoint} did not become ready: ${lastError}`);
}
