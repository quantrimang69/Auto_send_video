const logger = require('../utils/logger/app-logger');
const service = require("../service/admin.service");
const ResponseHelper = require('../utils/response');
const catchAsync = require("../utils/errorHandle/catchAsync");
const MessageHelper = require('../utils/message');

const updateNewVideo = catchAsync(async (req,res) => {
  try {
    logger.info(`UserAuthentication:login`);
    await service.updateNewVideo(req, res);
    ResponseHelper.responseSuccess(res, MessageHelper.getMessage('sendEmailSuccessfully'));
  } catch (error) {
    logger.error(`UserAuthentication:updateNewVideo:: -  ${error}`);
    ResponseHelper.responseError(res, error.message);
  }
});

module.exports = {
  updateNewVideo
}