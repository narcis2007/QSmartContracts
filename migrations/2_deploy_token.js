const BigNumber = require('bignumber.js')

const QToken = artifacts.require("QToken");
const PaymentProcessor = artifacts.require("PaymentProcessor");
const DiscountManager = artifacts.require("DiscountManager");
const FeeCollector = artifacts.require("FeeCollector");

module.exports = async function (deployer) {
    deployer.deploy(QToken, new BigNumber('1000000000').times(new BigNumber('10').pow(8)));
};