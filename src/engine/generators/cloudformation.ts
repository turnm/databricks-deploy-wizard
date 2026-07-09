import type { Answers, CodeFile, Recommendation } from '../types'

const FOOTER = '\n# Review before applying. This is a starting point, not production hardening.\n'

/**
 * AWS-only. CloudFormation template for the cross-account IAM role Databricks
 * needs for a classic workspace — an alternative to the Terraform aws_iam_role
 * resource in terraform.ts, for teams that standardise on CloudFormation.
 * Not relevant for serverless (nothing to provision) or other clouds.
 */
export function generateCloudFormation(answers: Answers, rec: Recommendation): CodeFile | null {
  if (rec.cloud !== 'aws' || rec.workspaceType !== 'aws-classic') return null

  const prefix = (answers.region || 'databricks').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const contents = `AWSTemplateFormatVersion: '2010-09-09'
Description: Cross-account IAM role for a Databricks classic workspace (${prefix})

Parameters:
  DatabricksAccountId:
    Type: String
    Description: Your Databricks account ID (found in the account console)
  ExternalId:
    Type: String
    Default: ${prefix}
    Description: External ID used in the trust policy, must match the value given to Databricks

Resources:
  CrossAccountRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: ${prefix}-cross-account-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: 'arn:aws:iam::414351767826:root' # Databricks control-plane account
            Action: 'sts:AssumeRole'
            Condition:
              StringEquals:
                'sts:ExternalId': !Ref ExternalId
      Policies:
        - PolicyName: databricks-cross-account-policy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 'ec2:*'
                  - 'iam:CreateServiceLinkedRole'
                Resource: '*'

Outputs:
  RoleArn:
    Description: Pass this ARN to Databricks when creating the credential configuration
    Value: !GetAtt CrossAccountRole.Arn
`

  return { filename: 'cross-account-role.yaml', language: 'yaml', contents: contents + FOOTER }
}
