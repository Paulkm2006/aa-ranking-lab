import { fitRanking } from "./solver";
self.onmessage = (event: MessageEvent<number[][]>) => {
  try {
    self.postMessage({ result: fitRanking(event.data) });
  } catch (e) {
    self.postMessage({ error: e instanceof Error ? e.message : "求解失败" });
  }
};
