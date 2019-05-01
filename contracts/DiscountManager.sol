pragma solidity ^0.5.0;

import "./QToken.sol";

contract DiscountManager is Ownable {

    //merchant address => buyer address => discount percentage
    mapping(address => mapping(address => uint)) loyaltyDiscountPercentage;
    //merchant address => buyer address => expiration timestamp
    mapping(address => mapping(address => uint)) loyaltyDiscountExpiration;
    mapping(address => uint) advertiserAcquiredDiscount;

    mapping(address => bool) firstTimeReferralBuyerDiscountRedeemed;

    mapping(address => bool) approvedPaymentProcessors; // TODO: abstract this in a new contract or as an inherited contract between the token and this one

    //maybe make it a mapping, each user to be able to have a personalized discount instead of a global one?
    uint buyerReferralDiscountPercentage = 5; // 5%
    uint advertiserReferralDiscountPercentage = 10; // 10%


    function acknowledgeReferralPurchase(address referringAddress) public onlyPaymentProcessor {
        advertiserAcquiredDiscount[referringAddress] = advertiserReferralDiscountPercentage;
    }

    function consumeAdvertiserReferralDiscount(address who) public onlyPaymentProcessor {
        advertiserAcquiredDiscount[who] = 0;
    }

    function consumeBuyerReferralDiscount(address who) public onlyPaymentProcessor {
        firstTimeReferralBuyerDiscountRedeemed[who] = true;
    }

    function getAdvertiserReferralDiscountInTokens(address who, uint price) public view returns (uint) {
        return (price * advertiserAcquiredDiscount[who]) / 100;
    }

    function setNextLoyaltyDiscountPercentage(address buyerAddress, address merchantAddress, uint nextLoyaltyDiscountPercentage, uint loyaltyDiscountExpirationTimestamp) public onlyPaymentProcessor {
        loyaltyDiscountPercentage[merchantAddress][buyerAddress] = nextLoyaltyDiscountPercentage;
        loyaltyDiscountExpiration[merchantAddress][buyerAddress] = loyaltyDiscountExpirationTimestamp;
    }

    function getLoyaltyDiscountInTokens(address buyerAddress, address merchantAddress, uint price) public view returns (uint) {
        if (loyaltyDiscountExpiration[merchantAddress][buyerAddress] != 0 && loyaltyDiscountExpiration[merchantAddress][buyerAddress] < now)
            return 0;
        return (price * loyaltyDiscountPercentage[merchantAddress][buyerAddress]) / 100;
    }

    function getBuyerReferralDiscountInTokens(address buyer, uint price) public view returns (uint){
        if (firstTimeReferralBuyerDiscountRedeemed[buyer] == true)
            return 0;
        return (price * buyerReferralDiscountPercentage) / 100;
    }

    modifier onlyPaymentProcessor() {
        require(approvedPaymentProcessors[msg.sender]);
        _;
    }

    function approvePaymentProcessorAddress(address paymentProcessorAddress) onlyOwner public {
        approvedPaymentProcessors[paymentProcessorAddress] = true;
    }

    function revokePaymentProcessorAddress(address paymentProcessorAddress) onlyOwner public {
        approvedPaymentProcessors[paymentProcessorAddress] = false;
    }
}
