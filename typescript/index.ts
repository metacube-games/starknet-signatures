import { ec, encode, TypedData, Signer, typedData, WeierstrassSignatureType } from 'starknet';

async function main() {
    //--------------------------------------------------------------------------
    // Account
    //--------------------------------------------------------------------------
    const privateKey = '0x1234567890987654321';

    const starknetPublicKey = ec.starkCurve.getStarkKey(privateKey);

    const fullPublicKey = encode.addHexPrefix(
        encode.buf2hex(ec.starkCurve.getPublicKey(privateKey, false))
    );

    const pubX = starknetPublicKey
    const pubY = encode.addHexPrefix(fullPublicKey.slice(68))

    console.log("Account:")
    console.log("\tprivate key: ", privateKey)
    // 0x1234567890987654321
    console.log("\tFull (uncompressed) public key: ", fullPublicKey)
    // 0x4020c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2018277bc1bc80570f859cb882ca70d52f1a0e06275e5dd704dddbbe19faadf
    console.log("\tCoordinates of the public key: x=", pubX, ", y=", pubY)
    // x=0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2, y=0x18277bc1bc80570f859cb882ca70d52f1a0e06275e5dd704dddbbe19faadf
    console.log("\tStarknet public key: ", starknetPublicKey, " (= x-coordinate of the public key)")
    // 0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2

    //--------------------------------------------------------------------------
    // Message
    //--------------------------------------------------------------------------

    const messageStructure: TypedData = {
        types: {
            StarkNetDomain: [
                { name: "name", type: "felt" },
                { name: "chainId", type: "felt" },
                { name: "version", type: "felt" },
            ],
            Message: [{ name: "message", type: "felt" }],
        },
        primaryType: "Message",
        domain: {
            name: "MyDapp",
            chainId: "SN_MAIN",
            version: "0.0.1",
        },
        message: {
            message: "hello world!",
        },
    };

    const messageHash = typedData.getMessageHash(messageStructure, BigInt(starknetPublicKey))

    console.log("\nMessage:")
    console.log("\tMessage hash: ", messageHash)
    // 0x197093614bca282524e6b8f77de8f7dd9a9dd92ed4ea7f4f2b17f95e2bc441d

    //--------------------------------------------------------------------------
    // Signature
    //--------------------------------------------------------------------------

    const signer = new Signer(privateKey)

    let signature: WeierstrassSignatureType;
    try {
        signature = (await signer.signMessage(messageStructure, starknetPublicKey)) as WeierstrassSignatureType
    } catch (error) {
        console.error("Error signing the message:", error);
        throw error;
    }

    const isValid = ec.starkCurve.verify(signature, messageHash, fullPublicKey)

    console.log("\nSignature:")
    console.log("\tSignature: ", signature)
    // r=0x59e1a24dc86990b8c1210d6e18d5641e6b94828d595b0d98279052f013e9945, s=0x72a50af8139178dddbb4b34ef2567fa78dcd44df8307cc47a2e39a6090e46eb
    console.log("\tSignature is valid: ", isValid)
    // true
}
main()
