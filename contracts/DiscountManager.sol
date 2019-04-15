pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./QToken.sol";

contract DiscountManager is Ownable {

    //merchant address => buyer address => discount percentage
    mapping(address => mapping(address => uint)) loyaltyDiscountPercentage;

    mapping(address => uint) advertiserAcquiredDiscount;

    //maybe make it a mapping, each user to be able to have a personalized discount instead of a global one?
    uint buyerReferralDiscountPercentage = 5; // 5%
    uint advertiserReferralDiscountPercentage = 10; // 10%

    QToken token;

    constructor(address tokenAddress) public {
        token = QToken(tokenAddress);
    }

    function acknowledgeReferralPurchase(address referringAddress) public onlyPaymentProcessor {
        advertiserAcquiredDiscount[referringAddress] = advertiserReferralDiscountPercentage;
    }

    function consumeReferralDiscount(address who) public onlyPaymentProcessor {
        advertiserAcquiredDiscount[who] = 0;
    }

    function getReferralDiscountInTokens(address who, uint price) public view returns (uint) {
        return (price * advertiserAcquiredDiscount[who]) / 100;
    }

    function setNextLoyaltyDiscountPercentage(address buyerAddress, address merchantAddress, uint nextLoyaltyDiscountPercentage) public onlyPaymentProcessor {
        loyaltyDiscountPercentage[merchantAddress][buyerAddress] = nextLoyaltyDiscountPercentage;
    }


    function getLoyaltyDiscountInTokens(address buyerAddress, address merchantAddress, uint price) public view returns (uint) {
        return (price * loyaltyDiscountPercentage[merchantAddress][buyerAddress]) / 100;
    }

    function getBuyerReferralDiscountInTokens(uint price) public view returns (uint){
        return (price * buyerReferralDiscountPercentage) / 100;
    }

    modifier onlyPaymentProcessor() {
        require(token.isApprovedPaymentProcessor(msg.sender));
        _;
    }
}
