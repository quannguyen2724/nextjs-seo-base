import message from "antd/lib/message";
import { pathOr } from "ramda";

export const displayError = async (res: any) => {
  if (!!res.json) {
    const data = await res.json();
    console.error('displayError1', data)
    message.error(
      pathOr(`Something Wrong`, ['message', 0], data)
    );
  } else if (!!res.message) {
    console.error('displayError2', res)
    message.error(
      pathOr(`Something Wrong`, ['message', 0], res)
    );
  }
  else {
    console.error('displayError3', res)
    message.error(`Something Wrong`);
  }
}