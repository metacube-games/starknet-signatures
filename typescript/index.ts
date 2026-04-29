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
    // 0x04020c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f200018277bc1bc80570f859cb882ca70d52f1a0e06275e5dd704dddbbe19faadf
    console.log("\tCoordinates of the public key: x=", pubX, ", y=", pubY)
    // x=0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2, y=0x00018277bc1bc80570f859cb882ca70d52f1a0e06275e5dd704dddbbe19faadf
    console.log("\tStarknet public key: ", starknetPublicKey, " (= x-coordinate of the public key)")
    // 0x20c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2

    //--------------------------------------------------------------------------
    // Message
    //--------------------------------------------------------------------------

    const messageStructure: TypedData = {
        types: {
            StarknetDomain: [
                { name: "name", type: "shortstring" },
                { name: "chainId", type: "shortstring" },
                { name: "version", type: "shortstring" },
                { name: "revision", type: "shortstring" },
            ],
            Message: [{ name: "message", type: "felt" }],
        },
        primaryType: "Message",
        domain: {
            name: "MyDapp",
            chainId: "SN_MAIN",
            version: "0.0.1",
            revision: "1",
        },
        message: {
            message: "hello world!",
        },
    };

    const messageHash = typedData.getMessageHash(messageStructure, BigInt(starknetPublicKey))

    console.log("\nMessage:")
    console.log("\tMessage hash: ", messageHash)
    // 0x2a0910fc7e1337ca97ecb1dd5db41f202073e74d3760dd149034765412e5404

    //--------------------------------------------------------------------------
    // Signature
    //--------------------------------------------------------------------------

    // NOTE: Signer.signMessage uses RFC6979 deterministic k-generation (via @scure/starknet →
    // @noble/curves), so the same private key and message always produce the same (r, s).
    // To get a different valid signature on each call, bypass Signer and pass extraEntropy:
    //   const sig = ec.starkCurve.sign(messageHash, privateKey, { extraEntropy: true });
    // This mixes random bytes into the RFC6979 k-derivation, making the output non-deterministic
    // while remaining cryptographically valid and verifiable.
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
    // r=0x79e8fa8fa16bd11347cb48e394e8c9d7071fc850f5dc6d786d4f0af8054fbe0, s=0x1f4d8d0a2ad806480e5741c236c43afec4710a4ccbae8f0d4f54116d6f65533
    console.log("\tSignature is valid: ", isValid)
    // true
}
main()
