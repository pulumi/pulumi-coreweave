import * as pulumi from "@pulumi/pulumi";

// waitForApiServer polls the cluster's API server until its schema is available.
export async function waitForApiServer(endpoint: string, token: string, deadline: number): Promise<void> {
    const url = `https://${endpoint}/openapi/v2`;
    pulumi.log.info(`waiting for api-server at ${url} to return 200`);

    let lastError: string | undefined;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(10000),
            });
            await res.body?.cancel();
            if (res.status === 200) {
                return;
            }
            lastError = `HTTP ${res.status}`;
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
        }
        await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error(`api server at ${endpoint} did not become ready: ${lastError}`);
}
