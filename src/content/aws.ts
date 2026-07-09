import type { AdminRequest, PlanStep } from '../engine/types'

export const aws = {
  displayName: 'AWS',
  docsLink: 'https://docs.databricks.com/aws/en/getting-started/',

  routes: {
    'aws-express': {
      label: 'Express setup',
      description:
        'Sign up with a business email — no AWS console access needed. Deploys a serverless workspace immediately with 14 days of trial credits.',
    },
    'aws-marketplace': {
      label: 'AWS Marketplace',
      description:
        'Subscribe from AWS Marketplace and auto-deploy a first serverless workspace, with up to $400 in trial credits. Usage rolls onto your existing AWS bill.',
    },
    'aws-direct': {
      label: 'Direct / sales-led',
      description:
        'For a negotiated commit. Can still be routed as an AWS Marketplace private offer so usage lands on the AWS bill.',
    },
  },

  marketplacePermission: 'AWSMarketplaceFullAccess (or AWSMarketplaceManageSubscriptions)',

  classicWorkspaceNote:
    'A classic workspace (cross-account IAM role + S3 root bucket + VPC) is only needed once you have networking or residency requirements. Automated configuration (IAM temporary delegation) handles this without console access, unless private networking is required — then it needs manual setup with PrivateLink.',

  adminRequest(): AdminRequest {
    return {
      neededRole: 'IAM permissions to approve a cross-account role (via automated configuration)',
      target: 'Your AWS account administrator',
      justification:
        'We want to move from the free express setup to a classic AWS workspace with networking controls. Databricks automated configuration sends a one-time approval request — no standing console access is granted, and the request expires after 7 days.',
      copyText:
        "Hi — I'm setting up a Databricks classic workspace on AWS. Databricks can send you an automated configuration request " +
        "(IAM temporary delegation) that creates the cross-account role, S3 root bucket and VPC for us. It needs one-time " +
        "approval from someone with IAM admin rights, and the request expires after 7 days if unused. Could you approve it " +
        "when it lands, or let me know a good time to do this together?",
    }
  },

  planSteps(opts: { route: 'aws-express' | 'aws-marketplace' | 'aws-direct'; needsClassic: boolean }): PlanStep[] {
    const steps: PlanStep[] = []
    if (opts.route === 'aws-express') {
      steps.push(
        { title: 'Sign up', detail: 'Go to the Databricks AWS express setup page and sign up with your business email — no AWS credentials required.' },
        { title: 'Workspace is provisioned automatically', detail: 'A serverless workspace deploys immediately, backed by Databricks-hosted compute — nothing to configure in your AWS account yet.' },
      )
    } else if (opts.route === 'aws-marketplace') {
      steps.push(
        { title: 'Subscribe on AWS Marketplace', detail: `Search "Databricks" on AWS Marketplace and subscribe. You'll need ${aws.marketplacePermission} in your AWS account.` },
        { title: 'Workspace auto-deploys', detail: 'Marketplace subscription auto-provisions a first serverless workspace, with trial credits applied.' },
      )
    } else {
      steps.push(
        { title: 'Speak to your Databricks account team', detail: 'Direct/sales-led onboarding sets up billing and workspace access as part of the commercial agreement.' },
      )
    }
    steps.push({ title: 'Run your first query', detail: 'Open SQL editor or a notebook, attach to serverless compute, and run a query against a sample or uploaded dataset.' })
    if (opts.needsClassic) {
      steps.push({ title: 'Plan the classic workspace', detail: 'When you need networking or residency controls, use automated configuration (or the generated Terraform) to stand up a classic workspace in your own VPC.' })
    }
    return steps
  },
}
