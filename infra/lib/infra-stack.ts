// infra/lib/gym-api-stack.ts
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class GymApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for bookings (replaces mock-db in production)
    const bookingsTable = new dynamodb.Table(this, "BookingsTable", {
      tableName: "fittech-bookings",
      partitionKey: { name: "gymId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "slotTime#userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // change to RETAIN in prod
    });

    // Lambda function for the Fastify API
    const apiLambda = new NodejsFunction(this, "GymApiFunction", {
      entry: path.join(__dirname, "../../apps/api/src/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: {
        BOOKINGS_TABLE: bookingsTable.tableName,
        NODE_ENV: "production",
      },
      bundling: {
        minify: true,
        externalModules: [], // bundle everything
      },
    });

    // Grant Lambda read/write access to DynamoDB
    bookingsTable.grantReadWriteData(apiLambda);

    // API Gateway — Lambda proxy integration
    const api = new apigateway.RestApi(this, "GymApi", {
      restApiName: "FitTech Gym API",
      description: "Handles gym capacity and booking",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(apiLambda, {
      proxy: true,
    });

    // /gyms/{id}/capacity  and  /gyms/{id}/book
    const gyms = api.root.addResource("gyms");
    const gym = gyms.addResource("{id}");
    gym.addResource("capacity").addMethod("GET", lambdaIntegration);
    gym.addResource("book").addMethod("POST", lambdaIntegration);

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway endpoint URL",
    });
  }
}