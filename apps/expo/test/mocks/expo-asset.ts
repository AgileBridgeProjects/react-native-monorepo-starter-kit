export const Asset = {
  fromModule: () => ({
    uri: '',
    localUri: null,
    width: null,
    height: null,
    name: '',
    type: '',
    hash: null,
    downloadAsync: async () => undefined,
  }),
  loadAsync: async () => [],
};
