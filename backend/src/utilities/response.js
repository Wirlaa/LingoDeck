// Custom response class to better show the codes and messages.

class response {
    constructor(status = false, code = 400, message = "", data = null) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.data = data;
    }
}

module.exports = response;