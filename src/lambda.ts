
type LambdaEvent = {
  svnUrl: string;
};

/**
 * Lambda function handler
 *
 * @param {string} event.svnUrl
 */
export const handler = async (event: LambdaEvent) => {

  return {
    hello: 'world',
    url: event.svnUrl,
  };
};
