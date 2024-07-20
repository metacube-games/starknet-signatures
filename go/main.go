package main

import (
	"fmt"
	"math/big"
	"strconv"

	"github.com/NethermindEth/starknet.go/curve"
	"github.com/NethermindEth/starknet.go/typed"
	"github.com/NethermindEth/starknet.go/utils"
)

// NOTE: at the time of writing, starknet.go forces us to create a custom
// message type as well as a method to format the message encoding since
// there is no built-in generic way to encode messages.
type MessageType struct {
	Message string
}

// FmtDefinitionEncoding is a method that formats the encoding of the message
func (m MessageType) FmtDefinitionEncoding(field string) (fmtEnc []*big.Int) {
	if field == "message" {
		if v, err := strconv.Atoi(m.Message); err == nil {
			fmtEnc = append(fmtEnc, big.NewInt(int64(v)))
		} else {
			fmtEnc = append(fmtEnc, utils.UTF8StrToBig(m.Message))
		}
	}
	return fmtEnc
}

func main() {
	//--------------------------------------------------------------------------
	// Account
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
	// Message
	//--------------------------------------------------------------------------

	types := map[string]typed.TypeDef{
		"StarkNetDomain": {
			Definitions: []typed.Definition{
				{Name: "name", Type: "felt"},
				{Name: "chainId", Type: "felt"},
				{Name: "version", Type: "felt"},
			},
		},
		"Message": {
			Definitions: []typed.Definition{
				{Name: "message", Type: "felt"},
			},
		},
	}

	primaryType := "Message"

	domain := typed.Domain{
		Name:    "MyDapp",
		ChainId: "SN_MAIN",
		Version: "0.0.1",
	}

	message := MessageType{
		Message: "hello world!",
	}

	td, err := typed.NewTypedData(types, primaryType, domain)
	if err != nil {
		fmt.Println("Error creating TypedData:", err)
		return
	}

	hash, err := td.GetMessageHash(starknetPublicKey, message, curve.Curve)
	if err != nil {
		fmt.Println("Error getting message hash:", err)
		return
	}

	fmt.Println("\nMessage:")
	fmt.Printf("\tMessage hash: 0x%s\n", hash.Text(16))
	// 0x197093614bca282524e6b8f77de8f7dd9a9dd92ed4ea7f4f2b17f95e2bc441d

	//--------------------------------------------------------------------------
	// Signature
	//--------------------------------------------------------------------------

	r, s, err := curve.Curve.Sign(hash, privateKey)
	if err != nil {
		fmt.Println("Error signing message:", err)
		return
	}

	isValid := curve.Curve.Verify(hash, r, s, starknetPublicKey, pubY)

	fmt.Println("\nSignature:")
	fmt.Printf("\tSignature: r=0x%s, s=0x%s\n", r.Text(16), s.Text(16))
	// r=0x59e1a24dc86990b8c1210d6e18d5641e6b94828d595b0d98279052f013e9945, s=0x72a50af8139178dddbb4b34ef2567fa78dcd44df8307cc47a2e39a6090e46eb
	fmt.Printf("\tSignature is valid: %t\n", isValid)
	// true
}
