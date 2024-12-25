package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/account"
	"github.com/NethermindEth/starknet.go/curve"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/typedData"
	"github.com/NethermindEth/starknet.go/utils"
)

const typedDataContent = `
{
	"types": {
	  	"StarkNetDomain": [
			{ "name": "name", "type": "felt" },
			{ "name": "chainId", "type": "felt" },
			{ "name": "version", "type": "felt" }
	  	],
	  	"Message": [
			{ "name": "message", "type": "felt" }
	  	]
	},
	"primaryType": "Message",
	"domain": {
	  	"name": "MyDapp",
	  	"chainId": "SN_MAIN",
	  	"version": "0.0.1"
	},
	"message": {
	  	"message": "hello world!"
	}
}
`

func main() {
	//--------------------------------------------------------------------------
	// Account with public key
	//--------------------------------------------------------------------------
	privateKey, _ := new(big.Int).SetString("1234567890987654321", 16)

	pubX, pubY, err := curve.Curve.PrivateToPoint(privateKey)
	if err != nil {
		fmt.Printf("Error: %s\n", err)
		return
	}
	if !curve.Curve.IsOnCurve(pubX, pubY) {
		fmt.Printf("Point is not on curve\n")
		return
	}

	starknetPublicKey := pubX

	// IMPORTANT: this is not a standard way to retrieve the full public key, it
	// is just for demonstration purposes as starknet.go does not provide a way
	// to retrieve the full public key at the time of writing.
	// Rule of thumb: never write your own cryptography code!
	fullPublicKey := new(big.Int).SetBytes(append(append(
		[]byte{0x04},                       // 0x04 is the prefix for uncompressed public keys
		pubX.Bytes()...), pubY.Bytes()...), // concatenate x and y coordinates
	)

	fmt.Println("Account:")
	fmt.Printf("\tPrivate key: 0x%s\n", privateKey.Text(16))
	// 0x1234567890987654321
	fmt.Printf("\tFull (uncompressed) public key: 0x%s\n", fullPublicKey.Text(16))
	// 0x4020c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2018277bc1bc80570f859cb882ca70d52f1a0e06275e5dd704dddbbe19faadf
	fmt.Printf("\tCoordinates of the public key: x=0x%s, y=0x%s\n", pubX.Text(16), pubY.Text(16))
	// x=0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2, y=0x18277bc1bc80570f859cb882ca70d52f1a0e06275e5dd704dddbbe19faadf
	fmt.Printf("\tStarknet public key: 0x%s (= x-coordinate of the public key)\n", starknetPublicKey.Text(16))
	// 0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2

	//--------------------------------------------------------------------------
	// Message with public key
	//--------------------------------------------------------------------------

	// NOTE: one can also build the typed data manually, following the fields
	// and types defined in typedData.TypedData struct.
	var ttd typedData.TypedData
	err = json.Unmarshal([]byte(typedDataContent), &ttd)
	if err != nil {
		fmt.Printf("Error: %s\n", err)
		return
	}

	hash, err := ttd.GetMessageHash(starknetPublicKey.String())
	if err != nil {
		fmt.Printf("Error: %s\n", err)
		return
	}

	fmt.Println("\nMessage:")
	fmt.Printf("\tMessage hash: 0x%s\n", hash.Text(16))
	// 0x197093614bca282524e6b8f77de8f7dd9a9dd92ed4ea7f4f2b17f95e2bc441d

	//--------------------------------------------------------------------------
	// Signature and verification with public key (check locally on curve)
	//--------------------------------------------------------------------------

	r, s, err := curve.Curve.Sign(hash.BigInt(new(big.Int)), privateKey)
	if err != nil {
		fmt.Println("Error signing message:", err)
		return
	}

	isValid := curve.Curve.Verify(hash.BigInt(new(big.Int)), r, s, starknetPublicKey, pubY)

	fmt.Println("\nSignature:")
	fmt.Printf("\tSignature: r=0x%s, s=0x%s\n", r.Text(16), s.Text(16))
	// r=0x59e1a24dc86990b8c1210d6e18d5641e6b94828d595b0d98279052f013e9945, s=0x72a50af8139178dddbb4b34ef2567fa78dcd44df8307cc47a2e39a6090e46eb
	fmt.Printf("\tSignature is valid: %t\n", isValid)
	// true

	//--------------------------------------------------------------------------
	// Account without public key
	//--------------------------------------------------------------------------
	// NOTE: you need a deployed account to run this code
	const RPC_URL = ""
	const ACCOUNT_ADDRESS = ""
	const ACCOUNT_CAIRO_VERSION = 2
	const PRIVATE_KEY = ""

	// Safety check to ensure const values are set
	if RPC_URL == "" || ACCOUNT_ADDRESS == "" || ACCOUNT_CAIRO_VERSION == 0 || PRIVATE_KEY == "" {
		fmt.Println("Please set the const values before running the on-chain example")
		return
	}

	provider, err := rpc.NewProvider(RPC_URL)
	if err != nil {
		fmt.Println("Error creating RPC provider:", err)
		return
	}

	ks := account.NewMemKeystore()
	privKeyBI, ok := new(big.Int).SetString(PRIVATE_KEY, 0)
	if !ok {
		fmt.Println("Error parsing private key")
		return
	}
	ks.Put("", privKeyBI)

	accountAddressInFelt, err := utils.HexToFelt(ACCOUNT_ADDRESS)
	if err != nil {
		fmt.Println("Error parsing account address")
		return
	}

	accnt, err := account.NewAccount(
		provider,
		accountAddressInFelt,
		"",
		ks,
		ACCOUNT_CAIRO_VERSION,
	)
	if err != nil {
		fmt.Println("Error creating account:", err)
		return
	}

	//--------------------------------------------------------------------------
	// Message without public key
	//--------------------------------------------------------------------------

	// NOTE: one can also build the typed data manually, following the fields
	// and types defined in typedData.TypedData struct.
	err = json.Unmarshal([]byte(typedDataContent), &ttd)
	if err != nil {
		fmt.Printf("Error: %s\n", err)
		return
	}

	hash, err = ttd.GetMessageHash(accnt.AccountAddress.String())
	if err != nil {
		fmt.Printf("Error: %s\n", err)
		return
	}

	fmt.Println("\nMessage:")
	fmt.Printf("\tMessage hash: 0x%s\n", hash.Text(16))

	//--------------------------------------------------------------------------
	// Signature and verification without public key (check on-chain)
	//--------------------------------------------------------------------------

	signature, err := accnt.Sign(context.Background(), hash)
	if err != nil {
		fmt.Println("Error signing message:", err)
		return
	}

	fmt.Println("\nSignature:")
	fmt.Printf("\tSignature: %v\n", signature)

	callData := []*felt.Felt{
		hash,
		(&felt.Felt{}).SetUint64(uint64(len(signature))),
	}

	callData = append(callData, signature...)

	tx := rpc.FunctionCall{
		ContractAddress: accountAddressInFelt,
		EntryPointSelector: utils.GetSelectorFromNameFelt(
			"is_valid_signature",
		),
		Calldata: callData,
	}

	result, err := provider.Call(context.Background(), tx, rpc.BlockID{Tag: "latest"})
	if err != nil {
		fmt.Println("Error calling function:", err)
		return
	}

	isValid2, err := hex.DecodeString(result[0].Text(16))
	if err != nil {
		fmt.Println("Error decoding result:", err)
		return
	}

	fmt.Println("Signature is valid:", string(isValid2) == "VALID")
}
