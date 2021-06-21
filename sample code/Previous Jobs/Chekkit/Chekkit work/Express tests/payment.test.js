const app = require("../../app");
const chai = require("chai");
const chaiHttp = require("chai-http");
const keys = require("../../config/keys");
const stripe = require("stripe")(keys.stripeSecretKey);

chai.use(chaiHttp);
const { expect } = chai;
const Invoice = require("@chekkit/invoice");
const Customer = require("@chekkit/customer");
const BusinessSettings = require("@chekkit/business_settings");

const TEST_BUSINESS_ID = "da1fs5asf29das2d"; // this is run-tests@chekkit.io
const TEST_USER_ID = "adfs5fs4d5f4dsf"; // run-tests user
const TEST_ACCOUNT_ID = "ds5fd6s5f6sf5"; // stripe account used for run-tests

let stripeInvoiceId;
let stripeCustomerId;
let stripePaymentIntent;
let customer;

const startUp = async () => {
	// create a customer
	customer = await Customer.create({
		_business: TEST_BUSINESS_ID,
		email: "test@email",
		phone: "+1234567890",
		name: "jake",
	});
	// create a stripe customer
	const stripeCustomer = await stripe.customers.create(
		{
			name: customer.name,
			phone: customer.phone, // optional
		},
		{
			stripeAccount: TEST_ACCOUNT_ID,
		}
	);
	stripeCustomerId = stripeCustomer.id;

	// create paymentIntent
	const paymentIntent = await stripe.paymentIntents.create(
		{
			amount: 100,
			customer: stripeCustomer.id,
			currency: "USD",
			description: "some description",
			metadata: {
				integration_check: "accept_a_payment",
				reference_number: "ref123",
			},
		},
		{ stripeAccount: TEST_ACCOUNT_ID }
	);

	stripePaymentIntent = paymentIntent;

	// create the invoice
	const stripeInvoice = await Invoice.create({
		referenceNumber: "ref123",
		paymentIntentId: paymentIntent.id,
		_customer: customer._id, // customer on our db
		_user: TEST_USER_ID, // user on our db
		_business: TEST_BUSINESS_ID,
	});

	// remove the stripe account
	await BusinessSettings.findOneAndUpdate(
		{
			_business: TEST_BUSINESS_ID,
		},
		{ stripeAccountId: null }
	);

	stripeInvoiceId = stripeInvoice._id;
};

const cleanUp = async () => {
	// delete a customer
	await Customer.deleteMany({ phone: "+12048980368" });
	// delete the invoice
	await Invoice.deleteMany({ _business: TEST_BUSINESS_ID });

	// delete a stripe customer
	await stripe.customers.del(stripeCustomerId, {
		stripeAccount: TEST_ACCOUNT_ID,
	});

	// remove the stripe account
	await BusinessSettings.findOneAndUpdate(
		{
			_business: TEST_BUSINESS_ID,
		},
		{ stripeAccountId: null }
	);
};

describe("/api/invoices/:_invoice", () => {
	it("with improper invoice", async () => {
		await startUp();

		const res = await chai
			.request(app)
			.get(`/api/invoices/${TEST_BUSINESS_ID}`);

		// expect there to be an error
		expect(res.body.error).to.equal(true);
		expect(res.body.message).to.equal(
			"No invoice associated with this id."
		);
	});

	it("with no stripe account", async () => {
		const res = await chai
			.request(app)
			.get(`/api/invoices/${stripeInvoiceId}`);

		// expect there to be an error
		expect(res.body.error).to.equal(true);
		expect(res.body.message).to.equal(
			"No stripe account associated with that business."
		);
	});

	it("expect correct results", async () => {
		// add account business settings
		await BusinessSettings.findOneAndUpdate(
			{
				_business: TEST_BUSINESS_ID,
			},
			{ stripeAccountId: TEST_ACCOUNT_ID }
		);

		const res = await chai
			.request(app)
			.get(`/api/invoices/${stripeInvoiceId}`);

		expect(res.status).to.equal(200);
		// expect data to exist
		expect(res.body.receiptData).to.not.equal(null);
		// expect it to have paymentIntent
		expect(res.body.invoiceData.twilioNumber).to.equal("+5594645");
		expect(res.body.invoiceData.phone).to.equal("+124654646");
		expect(res.body.invoiceData.username).to.equal("run-tests@chekkit.io");
		expect(res.body.invoiceData.brandColor).to.equal("#3D4050");
		expect(res.body.invoiceData.country).to.equal("CA");
		expect(res.body.invoiceData.name).to.equal("Chekkit Test");
		expect(res.body.invoiceData.paymentIntent.id).to.equal(
			stripePaymentIntent.id
		);
		expect(res.body.invoiceData.logoUrl).to.equal(
			"https://someURl.com.png"
		);
		expect(res.body.invoiceData.customerName).to.equal("jake");
		expect(res.body.invoiceData.customerEmail).to.equal("test@email");
		expect(res.body.invoiceData.customerPhone).to.equal("+1234567890");
		expect(res.body.stripeAccountId).to.equal(TEST_ACCOUNT_ID);
	});
});

describe("/api/receipts/:_invoice", () => {
	it("with improper invoice", async () => {
		const res = await chai
			.request(app)
			.get(`/api/receipts/${TEST_BUSINESS_ID}`);

		expect(res.body.error).to.equal(true);
		expect(res.body.message).to.equal(
			"No invoice associated with this id."
		);
	});

	it("", async () => {
		const res = await chai
			.request(app)
			.get(`/api/receipts/${stripeInvoiceId}`);

		expect(res.status).to.equal(200);
		// expect data to exist
		expect(res.body.receiptData).to.not.equal(null);
		// expect it to have paymentIntent
		expect(res.body.receiptData.paymentIntent.id).to.equal(
			stripePaymentIntent.id
		);
		expect(res.body.receiptData.customer._id).to.equal(
			customer._id.toString()
		);
		expect(res.body.receiptData.businessProfile.name).to.equal(
			"Chekkit Test Account"
		);
	});
});

describe("/api/mark-invoice-as-opened", () => {
	it("", async () => {
		const invoice = await Invoice.find({
			_id: stripeInvoiceId,
		}).lean();

		expect(invoice.opened).to.equal(undefined);

		const res = await chai
			.request(app)
			.post(`/api/mark-invoice-as-opened`)
			.send({ _invoice: stripeInvoiceId });

		const newInvoice = await Invoice.find({
			_id: stripeInvoiceId,
			opened: true,
		}).lean();

		expect(res.error).to.equal(false);
		expect(newInvoice).to.not.equal(null);

	 await cleanUp();
	});
});
