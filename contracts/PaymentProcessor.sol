pragma solidity ^0.5.0;

import "./QToken.sol";
import "./DiscountManager.sol";

contract PaymentProcessor {

    QToken token;
    DiscountManager discountManager;

    constructor(address tokenAddress, address discountManagerAddress) public {
        token = QToken(tokenAddress);
        discountManager = DiscountManager(discountManagerAddress);
    }

    /**
    * the merchant submits the customer proof through this function to pull the tokens in his address
    * msg.sender is the merchant address
    **/
    function processPayment(string memory product, uint256 price, uint256 timestamp, uint8 v, bytes32 r, bytes32 s, uint nextLoyaltyDiscountPercentage) public {
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(msg.sender, product, price, timestamp))));

        // Get the buyerAddress which signed the message
        address buyerAddress = ecrecover(hash, v, r, s);
        require(buyerAddress != address(0x0), 'buyerAddress is not valid!');

        //TODO: add referral deal handling
        uint loyaltyDiscount = discountManager.getLoyaltyDiscountInTokens(buyerAddress, msg.sender, price);

        token.paymentProcessorTransferFrom(buyerAddress, msg.sender, price - loyaltyDiscount, hash);
        //check for a 0 discount maybe it saves more gas overall?
        discountManager.setNextLoyaltyDiscountPercentage(buyerAddress, msg.sender, nextLoyaltyDiscountPercentage);
    }

    //TODO: add function to accept merchant signature too and perceive a fee for the one who sent the transaction to be processed


}
