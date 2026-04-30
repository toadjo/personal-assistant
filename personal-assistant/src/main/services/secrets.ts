import keytar from "keytar";

const SERVICE = "personal-assistant";
const ACCOUNT = "home-assistant-token";

export async function saveHaToken(token: string): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, token);
}

export async function getHaToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT);
}
