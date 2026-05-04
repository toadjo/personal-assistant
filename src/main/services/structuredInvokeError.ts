import type { AssistantInvokeFailure } from "../../shared/invokeErrors";
import { encodeAssistantInvokeFailure } from "../../shared/invokeErrors";
import { mainLog } from "../log";

/** Log structured codes for debugging; user-facing text lives on the thrown `Error` message (encoded). */
export function throwAssistantInvoke(failure: AssistantInvokeFailure): never {
  mainLog.warn("[assistant:invoke]", {
    domain: failure.domain,
    code: failure.code,
    retryable: failure.retryable
  });
  throw encodeAssistantInvokeFailure(failure);
}
