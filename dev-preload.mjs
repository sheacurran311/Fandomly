import { neonConfig } from '@neondatabase/serverless';

neonConfig.wsProxy = (host) => `localhost:5488/v2`;
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;
