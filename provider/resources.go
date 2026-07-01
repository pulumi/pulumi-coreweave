// Copyright 2016-2026, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package coreweave

import (
	"bytes"
	"path"

	// Allow embedding bridge-metadata.json in the provider.
	_ "embed"

	provider "github.com/coreweave/terraform-provider-coreweave/pulumi-shim"

	pfbridge "github.com/pulumi/pulumi-terraform-bridge/v3/pkg/pf/tfbridge"
	"github.com/pulumi/pulumi-terraform-bridge/v3/pkg/tfbridge"
	"github.com/pulumi/pulumi-terraform-bridge/v3/pkg/tfbridge/tokens"

	"github.com/pulumi/pulumi-coreweave/provider/pkg/version"
)

// all of the token components used below.
const (
	// This variable controls the default name of the package in the package
	// registries for nodejs and python:
	mainPkg = "coreweave"
	// modules:
	mainMod = "index" // the main module
)

//go:embed cmd/pulumi-resource-coreweave/bridge-metadata.json
var metadata []byte

// The upstream Terraform provider's index doc only ships a
// provider-configuration example, which the bridge renders as a trivial
// Example Usage on the registry. providerConfigExample is that upstream
// snippet; exampleUsageHCL is a real resource example (a VPC + a CKS
// cluster) substituted in its place so the registry shows usable code.
// The bridge converts this HCL to every SDK language.
const providerConfigExample = "provider \"coreweave\" {\n  token = \"CW-SECRET-XXXXXXXXXXXXX\"\n}"

const exampleUsageHCL = `resource "coreweave_networking_vpc" "default" {
  name = "default"
  zone = "US-EAST-04A"
  vpc_prefixes = [
    { name = "pod cidr", value = "10.0.0.0/13" },
    { name = "service cidr", value = "10.16.0.0/22" },
    { name = "internal lb cidr", value = "10.32.4.0/22" },
  ]
}

resource "coreweave_cks_cluster" "default" {
  name                   = "default"
  version                = "v1.35"
  zone                   = "US-EAST-04A"
  vpc_id                 = coreweave_networking_vpc.default.id
  public                 = true
  pod_cidr_name          = "pod cidr"
  service_cidr_name      = "service cidr"
  internal_lb_cidr_names = ["internal lb cidr"]
}`

// Provider returns additional overlaid schema and metadata associated with the provider.
func Provider() tfbridge.ProviderInfo {
	// Create a Pulumi provider mapping
	prov := tfbridge.ProviderInfo{
		//nolint:lll
		P: pfbridge.ShimProvider(provider.Provider(version.Version)),

		Name:    mainPkg,
		Version: version.Version,
		// DisplayName is a way to be able to change the casing of the provider name when being
		// displayed on the Pulumi registry
		DisplayName: "CoreWeave",
		// Change this to your personal name (or a company name) that you would like to be shown in
		// the Pulumi Registry if this package is published there.
		Publisher: "Pulumi",
		// LogoURL is optional but useful to help identify your package in the Pulumi Registry
		// if this package is published there.
		//
		// You may host a logo on a domain you control or add an PNG logo (100x100) for your package
		// in your repository and use the raw content URL for that file as your logo URL.
		LogoURL: "https://raw.githubusercontent.com/pulumi/pulumi-coreweave/main/docs/logo.png",
		// PluginDownloadURL is an optional URL used to download the Provider
		// for use in Pulumi programs
		// e.g. https://github.com/org/pulumi-provider-name/releases/download/v${VERSION}/
		PluginDownloadURL: "",
		Description:       "A Pulumi package for creating and managing CoreWeave cloud resources.",
		// category/cloud tag helps with categorizing the package in the Pulumi Registry.
		// For all available categories, see `Keywords` in
		// https://www.pulumi.com/docs/guides/pulumi-packages/schema/#package.
		Keywords:   []string{mainPkg, "category/cloud"},
		License:    "Apache-2.0",
		Homepage:   "https://www.pulumi.com",
		Repository: "https://github.com/pulumi/pulumi-coreweave",
		// The GitHub Org for the provider - defaults to `terraform-providers`. Note that this should
		// match the TF provider module's require directive, not any replace directives.
		GitHubOrg: "coreweave",
		// Path to the upstream provider's git submodule, so registry-docs
		// reads upstream docs locally instead of via `go mod download`
		// (which cannot resolve the filesystem-replaced submodule).
		UpstreamRepoPath: "./upstream",
		MetadataInfo:     tfbridge.NewProviderMetadata(metadata),
		DocRules: &tfbridge.DocRuleInfo{
			EditRules: func(defaults []tfbridge.DocsEdit) []tfbridge.DocsEdit {
				return append(defaults, tfbridge.DocsEdit{
					Path: "index.md",
					Edit: func(_ string, content []byte) ([]byte, error) {
						return bytes.Replace(content,
							[]byte(providerConfigExample),
							[]byte(exampleUsageHCL), 1), nil
					},
				})
			},
		},
		JavaScript: &tfbridge.JavaScriptInfo{
			// RespectSchemaVersion ensures the SDK is generated linking to the correct version of the provider.
			RespectSchemaVersion: true,
		},
		Python: &tfbridge.PythonInfo{
			// RespectSchemaVersion ensures the SDK is generated linking to the correct version of the provider.
			RespectSchemaVersion: true,
			// Enable modern PyProject support in the generated Python SDK.
			PyProject: struct{ Enabled bool }{true},
		},
		Golang: &tfbridge.GolangInfo{
			// Set where the SDK is going to be published to.
			ImportBasePath: path.Join(
				"github.com/pulumi/pulumi-coreweave/sdk/",
				tfbridge.GetModuleMajorVersion(version.Version),
				"go",
				mainPkg,
			),
			// Opt in to all available code generation features.
			GenerateResourceContainerTypes: true,
			GenerateExtraInputTypes:        true,
			// RespectSchemaVersion ensures the SDK is generated linking to the correct version of the provider.
			RespectSchemaVersion: true,
		},
		CSharp: &tfbridge.CSharpInfo{
			// RespectSchemaVersion ensures the SDK is generated linking to the correct version of the provider.
			RespectSchemaVersion: true,
			// Use a wildcard import so NuGet will prefer the latest possible version.
			PackageReferences: map[string]string{
				"Pulumi": "3.*",
			},
			// Brand the .NET namespace/package as "CoreWeave" (matching DisplayName)
			// rather than the default title-cased provider name "Coreweave".
			Namespaces: map[string]string{
				mainPkg: "CoreWeave",
			},
		},
	}

	// MustComputeTokens maps all resources and datasources from the upstream provider into Pulumi.
	//
	// tokens.SingleModule puts every upstream item into your provider's main module.
	//
	// You shouldn't need to override anything, but if you do, use the [tfbridge.ProviderInfo.Resources]
	// and [tfbridge.ProviderInfo.DataSources].
	prov.MustComputeTokens(tokens.SingleModule("coreweave_", mainMod,
		tokens.MakeStandard(mainPkg)))

	prov.MustApplyAutoAliases()
	prov.SetAutonaming(255, "-")

	return prov
}
