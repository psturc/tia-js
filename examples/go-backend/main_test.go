package main

import (
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

func TestGoBackendApp(t *testing.T) {
	RegisterFailHandler(Fail)

	// Set up TIA coverage collection hooks
	SetupTIAHooks()

	RunSpecs(t, "Go Backend App Suite")
}
