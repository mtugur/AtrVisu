export const allowedE2EPorts = Object.freeze([5173, 5174, 5175, 5176, 5177]);

export const resolveE2EServerMode = (environment) => {
  if (environment.ATRVISU_E2E_REUSE_EXISTING !== "1") {
    return { mode: "owned" };
  }

  const baseUrl = environment.ATRVISU_E2E_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      "ATRVISU_E2E_REUSE_EXISTING=1 requires an explicit ATRVISU_E2E_BASE_URL. "
      + "The caller is responsible for verifying the reused server's code identity."
    );
  }

  return { mode: "external", baseUrl };
};

export const selectAvailableE2EPort = async (ports, isAvailable) => {
  for (const port of ports) {
    if (await isAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available AtrVisu E2E port was found in: ${ports.join(", ")}.`);
};

export const createOwnedServer = (processHandle) => ({
  ownership: "owned",
  processHandle
});

export const createExternalServer = (baseUrl) => ({
  ownership: "external",
  baseUrl
});

export const stopOwnedE2EServer = async (server, stopProcess) => {
  if (server?.ownership === "owned") {
    await stopProcess(server.processHandle);
  }
};

export const createPlaywrightEnvironment = (environment, baseUrl) => ({
  ...environment,
  ATRVISU_E2E_EXTERNAL_SERVER: "1",
  ATRVISU_E2E_BASE_URL: baseUrl
});
