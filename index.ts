import axios from 'axios';
import { Handler, APIGatewayEvent } from 'aws-lambda';

interface GhostObject {
  slug?: string;
  url?: string;
}

interface GhostWebhookObject {
  current: GhostObject;
  previous: GhostObject;
}

interface GhostWebhookPayload {
  page?: GhostWebhookObject;
  post?: GhostWebhookObject;
}

interface CloudflarePurgeFilesResponse {
  success: boolean;
}

const cfId = process.env.CLOUDFLARE_IDENTIFIER;
const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
const ghostUrl = process.env.GHOST_URL;

function getFilesFromPayload(payload: GhostWebhookPayload) {
  const object = payload.page || payload.post;

  if (!object) {
    return [];
  }

  const files = [];
  for (const state of ['current', 'previous']) {
    if (object[state].url) {
      files.push(object[state].url);
    } else if (object[state].slug) {
      files.push(ghostUrl + object[state].slug);
    }
  }
}

export const handler: Handler<APIGatewayEvent> = async (event) => {
  const files = [ghostUrl];

  if (event.body) {
    const payload: GhostWebhookPayload = JSON.parse(event.body);
    files.concat(getFilesFromPayload(payload));
  }

  const response = await axios.post<CloudflarePurgeFilesResponse>(
    `https://api.cloudflare.com/client/v4/zones/${cfId}/purge_cache`,
    { files },
    { headers: { 'Authorization': `Bearer ${cfApiToken}` } }
  );

  if (!response.data.success) {
    throw new Error(JSON.stringify(response.data));
  }

  return response.data;
};
