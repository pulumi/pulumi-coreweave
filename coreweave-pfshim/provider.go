package pulumishim

import (
	internalprovider "github.com/coreweave/terraform-provider-coreweave/internal/provider"
	pfprovider "github.com/hashicorp/terraform-plugin-framework/provider"
)

func Provider(version string) pfprovider.Provider {
	return internalprovider.New(version)()
}
