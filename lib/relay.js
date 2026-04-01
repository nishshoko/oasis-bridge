import { createClient, MAINNET_RELAY_API, getClient } from "@relayprotocol/relay-sdk";

let initialized = false;

export function initRelay() {
  if (initialized) return;
  createClient({
    baseApiUrl: MAINNET_RELAY_API,
    source: "oasis-bridge",
  });
  initialized = true;
}

export function getRelayClient() {
  initRelay();
  return getClient();
}
