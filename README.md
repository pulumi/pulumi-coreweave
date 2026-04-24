# Pulumi provider for CoreWeave

The CoreWeave Resource Provider lets you manage [CoreWeave](https://coreweave.com/) resources.


## Installing

This package is available for several languages/platforms:

### Node.js (JavaScript/TypeScript)

To use from JavaScript or TypeScript in Node.js, install using either `npm`:

```bash
npm install @pulumi/coreweave
```

or `yarn`:

```bash
yarn add @pulumi/coreweave
```

### Python

To use from Python, install using `pip`:

```bash
pip install pulumi_coreweave
```

### Go

To use from Go, use `go get` to grab the latest version of the library:

```bash
go get github.com/pulumi/pulumi-coreweave/sdk/go/...
```

### .NET

To use from .NET, install using `dotnet add package`:

```bash
dotnet add package Pulumi.CoreWeave
```


## Configuration

The CoreWeave provider has the following configuration options:

| Option | Required | Description |
|--------|----------|-------------|
| `coreweave:token` | Optional | CoreWeave API token in the form `CW-SECRET-<secret>`. Can also be set via the `COREWEAVE_API_TOKEN` environment variable, which takes precedence. |
| `coreweave:endpoint` | Optional | CoreWeave API endpoint. Can also be set via the `COREWEAVE_API_ENDPOINT` environment variable, which takes precedence. Defaults to `https://api.coreweave.com/`. |
| `coreweave:httpTimeout` | Optional | Timeout duration for the HTTP client (e.g. `30s`). Can also be set via the `COREWEAVE_HTTP_TIMEOUT` environment variable, which takes precedence. Defaults to `10s`. |
| `coreweave:s3Endpoint` | Optional | CoreWeave S3 endpoint, used for CoreWeave Object Storage. Can also be set via the `COREWEAVE_S3_ENDPOINT` environment variable, which takes precedence. Defaults to `https://cwobject.com`. |

### Setting configuration values

Use `pulumi config set` to configure the provider. The token is sensitive, so use the `--secret` flag:

```bash
pulumi config set --secret coreweave:token CW-SECRET-XXXXXXXXXXXXX
```

Or set the token via environment variable:

```bash
export COREWEAVE_API_TOKEN=CW-SECRET-XXXXXXXXXXXXX
```

### Example usage

```typescript
import * as coreweave from "@pulumi/coreweave";

const provider = new coreweave.Provider("coreweave", {
    token: "CW-SECRET-XXXXXXXXXXXXX",
});
```

```python
import pulumi_coreweave as coreweave

provider = coreweave.Provider("coreweave",
    token="CW-SECRET-XXXXXXXXXXXXX",
)
```

```go
import "github.com/pulumi/pulumi-coreweave/sdk/go/coreweave"

provider, err := coreweave.NewProvider(ctx, "coreweave", &coreweave.ProviderArgs{
    Token: pulumi.String("CW-SECRET-XXXXXXXXXXXXX"),
})
```

```csharp
var provider = new CoreWeave.Provider("coreweave", new CoreWeave.ProviderArgs
{
    Token = "CW-SECRET-XXXXXXXXXXXXX",
});
```

