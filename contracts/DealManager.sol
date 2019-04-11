pragma solidity ^0.5.0;

import "./QToken.sol";

contract DealManager {


    mapping(address => bool) loyaltyDiscountActive;
    mapping(address => uint) loyaltyDiscountPercentage;

    QToken token;

    constructor(address tokenAddress) public {
        token = QToken(tokenAddress);
    }

//TODO: compute deals
}
