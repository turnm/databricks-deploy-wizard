import type { Answers, CodeFile, Recommendation } from '../types'

const FOOTER = '\n# Review before applying. This is a starting point, not production hardening.\n'

function prefixFrom(region: string): string {
  const slug = region.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return slug ? `databricks-${slug}` : 'databricks'
}

function awsTerraform(answers: Answers, rec: Recommendation): CodeFile[] {
  const prefix = prefixFrom(answers.region)
  const region = answers.region || 'us-east-1'

  const variables = `variable "region" {
  description = "AWS region for the workspace"
  type        = string
  default     = "${region}"
}

variable "prefix" {
  description = "Prefix used to name generated resources"
  type        = string
  default     = "${prefix}"
}

variable "cidr_block" {
  description = "CIDR block for the workspace VPC"
  type        = string
  default     = "10.4.0.0/16"
}
`

  const provider = `terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = var.region
}

provider "databricks" {
  alias      = "mws"
  host       = "https://accounts.cloud.databricks.com"
}
`

  let main: string
  if (rec.workspaceType === 'aws-classic') {
    main = `# Classic AWS workspace: cross-account IAM role, S3 root bucket and VPC.
resource "aws_s3_bucket" "root_storage" {
  bucket = "\${var.prefix}-root-bucket"
}

resource "aws_iam_role" "cross_account" {
  name = "\${var.prefix}-cross-account-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = "arn:aws:iam::414351767826:root" # Databricks control-plane account
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "sts:ExternalId" = var.prefix
        }
      }
    }]
  })
}

# Known IAM propagation race: the cross-account role isn't always visible to the
# Databricks control plane immediately after creation, so pause before validating it.
resource "time_sleep" "wait_for_iam_propagation" {
  depends_on      = [aws_iam_role.cross_account]
  create_duration = "20s"
}

resource "aws_vpc" "workspace" {
  cidr_block = var.cidr_block
  tags = {
    Name = "\${var.prefix}-vpc"
  }
}

resource "databricks_mws_credentials" "this" {
  provider         = databricks.mws
  credentials_name = "\${var.prefix}-creds"
  role_arn         = aws_iam_role.cross_account.arn
  depends_on       = [time_sleep.wait_for_iam_propagation]
}

resource "databricks_mws_storage_configurations" "this" {
  provider                   = databricks.mws
  storage_configuration_name = "\${var.prefix}-storage"
  bucket_name                = aws_s3_bucket.root_storage.bucket
}
${
  answers.networking === 'private'
    ? `
# Private networking requested: pair this VPC with PrivateLink connectivity
# (front-end and back-end) rather than relying on automated configuration.
resource "databricks_mws_vpc_endpoint" "backend_rest" {
  provider            = databricks.mws
  aws_account_id      = "" # fill in your AWS account ID
  vpc_endpoint_name   = "\${var.prefix}-backend-rest"
  region              = var.region
}
`
    : ''
}`
  } else {
    main = `# Serverless workspace — provisioned automatically via ${rec.routeLabel},
# no infrastructure to apply yet. Nothing below is created unless you
# uncomment it, kept here so the classic path is one step away when you
# outgrow serverless (e.g. networking or residency requirements appear).

# resource "aws_vpc" "workspace" {
#   cidr_block = var.cidr_block
# }
`
  }

  return [
    { filename: 'variables.tf', language: 'hcl', contents: variables + FOOTER },
    { filename: 'provider.tf', language: 'hcl', contents: provider + FOOTER },
    { filename: 'main.tf', language: 'hcl', contents: main + FOOTER },
  ]
}

function azureTerraform(answers: Answers, rec: Recommendation): CodeFile[] {
  const prefix = prefixFrom(answers.region)
  const region = answers.region || 'UK South'
  const needsVnet = rec.workspaceType === 'azure-vnet-injected'

  const variables = `variable "region" {
  description = "Azure region for the workspace"
  type        = string
  default     = "${region}"
}

variable "prefix" {
  description = "Prefix used to name generated resources"
  type        = string
  default     = "${prefix}"
}

variable "resource_group_name" {
  description = "Resource group to deploy the workspace into"
  type        = string
  default     = "\${var.prefix}-rg"
}
`

  const provider = `terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
    azurerm = {
      source = "hashicorp/azurerm"
    }
  }
}

provider "azurerm" {
  features {}
}
`

  const main = `resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.region
}
${
  needsVnet
    ? `
# VNet injection must be chosen at workspace creation — it cannot be
# retrofitted onto an existing workspace, hence it's set directly on
# azurerm_databricks_workspace below.
resource "azurerm_virtual_network" "this" {
  name                = "\${var.prefix}-vnet"
  address_space       = ["10.179.0.0/16"]
  location            = azurerm_resource_group.this.location
  resource_group_name  = azurerm_resource_group.this.name
}

resource "azurerm_subnet" "public" {
  name                 = "\${var.prefix}-public"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.179.0.0/18"]

  delegation {
    name = "databricks-delegation"
    service_delegation {
      name    = "Microsoft.Databricks/workspaces"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "private" {
  name                 = "\${var.prefix}-private"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.179.64.0/18"]

  delegation {
    name = "databricks-delegation"
    service_delegation {
      name    = "Microsoft.Databricks/workspaces"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}
`
    : ''
}
resource "azurerm_databricks_workspace" "this" {
  name                        = "\${var.prefix}-workspace"
  resource_group_name         = azurerm_resource_group.this.name
  location                    = azurerm_resource_group.this.location
  sku                         = "premium"
${
    needsVnet
      ? `
  custom_parameters {
    virtual_network_id                                  = azurerm_virtual_network.this.id
    public_subnet_name                                  = azurerm_subnet.public.name
    private_subnet_name                                 = azurerm_subnet.private.name
    public_subnet_network_security_group_association_id  = azurerm_subnet.public.id
    private_subnet_network_security_group_association_id = azurerm_subnet.private.id
    no_public_ip                                        = true
  }
`
      : ''
  }}
`

  const files: CodeFile[] = [
    { filename: 'variables.tf', language: 'hcl', contents: variables + FOOTER },
    { filename: 'provider.tf', language: 'hcl', contents: provider + FOOTER },
    { filename: 'main.tf', language: 'hcl', contents: main + FOOTER },
  ]
  return files
}

function gcpTerraform(answers: Answers, rec: Recommendation): CodeFile[] {
  const prefix = prefixFrom(answers.region)
  const region = answers.region || 'europe-west2'
  const needsVpc = rec.workspaceType === 'gcp-customer-vpc'

  const variables = `variable "project" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the workspace"
  type        = string
  default     = "${region}"
}

variable "prefix" {
  description = "Prefix used to name generated resources"
  type        = string
  default     = "${prefix}"
}
`

  const provider = `terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
    google = {
      source = "hashicorp/google"
    }
  }
}

provider "google" {
  project = var.project
  region  = var.region
}
`

  const main = `${
    needsVpc
      ? `# Customer-managed VPC with the two secondary IP ranges Databricks needs
# for pods and services.
resource "google_compute_network" "this" {
  name                    = "\${var.prefix}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "this" {
  name          = "\${var.prefix}-subnet"
  ip_cidr_range = "10.10.0.0/18"
  region        = var.region
  network       = google_compute_network.this.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.11.0.0/18"
  }
  secondary_ip_range {
    range_name    = "svc"
    ip_cidr_range = "10.12.0.0/18"
  }
}

resource "databricks_mws_networks" "this" {
  account_id         = "" # fill in your Databricks account ID
  network_name       = "\${var.prefix}-network"
  gcp_network_info {
    network_project_id    = var.project
    vpc_id                = google_compute_network.this.name
    subnet_id             = google_compute_subnetwork.this.name
    subnet_region         = var.region
    pod_ip_range_name     = "pods"
    service_ip_range_name = "svc"
  }
}
`
      : `# Standard workspace — Databricks manages networking in a default VPC.
`
  }
resource "databricks_mws_workspaces" "this" {
  account_id     = "" # fill in your Databricks account ID
  workspace_name = "\${var.prefix}-workspace"
  location       = var.region
${needsVpc ? '  network_id     = databricks_mws_networks.this.network_id\n' : ''}}
`

  return [
    { filename: 'variables.tf', language: 'hcl', contents: variables + FOOTER },
    { filename: 'provider.tf', language: 'hcl', contents: provider + FOOTER },
    { filename: 'main.tf', language: 'hcl', contents: main + FOOTER },
  ]
}

export function generateTerraform(answers: Answers, rec: Recommendation): CodeFile[] {
  switch (rec.cloud) {
    case 'aws':
      return awsTerraform(answers, rec)
    case 'azure':
      return azureTerraform(answers, rec)
    case 'gcp':
      return gcpTerraform(answers, rec)
  }
}
