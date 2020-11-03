const dotenv = require('dotenv')
dotenv.config()

const mongodb = require('mongodb')

const connectionString = 'mongodb+srv://todoAppUser:mongolia4444@cluster0.wiavm.mongodb.net/ComplexApp?retryWrites=true&w=majority'

mongodb.connect(process.env.CONNECTIONSTRING, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client) {
    module.exports = client
    // databse iin medeelliig aguulna

    const app = require('./app')
    app.listen(process.env.PORT)
})