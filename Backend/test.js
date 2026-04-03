require('dotenv').config();
const { classifyMessage } = require('./services/claude');

(async () => {
  console.log("Testing...");

  const res = await classifyMessage(
    "Andheri me flood hai, 5 log fase hue hai, boat chahiye"
  );

  console.log(res);
})();