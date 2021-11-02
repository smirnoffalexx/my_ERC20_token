async function both(contract, method, args = []) {
    const reply = await contract.callStatic[method](...args);
    const receipt = await contract[method](...args);
    return { reply, receipt };
}
 
module.exports = { both };