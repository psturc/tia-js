package main_test

import (
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

func TestPerTestRealE2E(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Go Backend Per-Test Real E2E Suite")
}

