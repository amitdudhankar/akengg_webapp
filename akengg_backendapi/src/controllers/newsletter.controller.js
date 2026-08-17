const newsletterService = require("../services/newsletter.service");

const subscribe = async (req, res) => {
  const subscriber = await newsletterService.subscribe(req.body);
  res.status(201).json({
    message: "Subscribed successfully",
    data: subscriber,
  });
};

const getSubscribers = async (req, res) => {
  const subscribers = await newsletterService.getSubscribers();
  res.status(200).json({
    message: "Subscribers fetched successfully",
    data: subscribers,
  });
};

const deleteSubscriber = async (req, res) => {
  await newsletterService.deleteSubscriber(req.params.id);
  res.status(200).json({
    message: "Subscriber deleted successfully",
  });
};

module.exports = {
  subscribe,
  getSubscribers,
  deleteSubscriber,
};
