package main_test

import (
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

func TestPerTestE2E(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Go Backend Per-Test E2E Suite")
}


