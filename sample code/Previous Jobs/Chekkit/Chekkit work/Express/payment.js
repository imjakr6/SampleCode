const requireLogin = require('../middlewares/requireLogin'),
	requireStripeAccount = require('../middlewares/requireStripeAccount'),
	keys = require('../config/keys'),
	stripe = require('stripe')(keys.stripeSecretKey),
	BusinessSettings = require('@chekkit/business_settings'),
	Business = require('@chekkit/business'),
	Customer = require('@chekkit/customer'),
	Invoice = require('@chekkit/invoice'),
	formatPhoneForTwilio = require('@chekkit/format_phone_for_twilio'),
	shortenPaymentsUrl = require('../services/utils/payments/shortenPaymentsUrl'),
	sendErrorEmail = require('../services/utils/sendErrorEmail'),
	findOrCreateCustomer = require('../services/queries/customer/findOrCreateCustomer'),
	findOrCreateCustomerFromEmail = require('../services/queries/customer/findOrCreateCustomerFromEmail'),
	FILE_NAME = 'payment.js';

module.exports = (app) => {
	// if no stripe customer exists, create a new one
	// stripeCustomerId is the customer id defined by stripe e.g. cus_H3qb53x0TX6RoT
	// stripeAccountId is the stripe connect account unique for this business e.g. acct_1DZ7oXHxHg6gOr3I
	const findOrCreateStripeCustomer = async ({
		stripeCustomerId,
		stripeAccountId,
		customer,
		_business,
	}) => {
		let stripeCustomer;

		if (stripeCustomerId) {
			stripeCustomer = await stripe.customers.retrieve(stripeCustomerId, {
				stripeAccount: stripeAccountId,
			});
		}

		if (!stripeCustomer) {
			// if customer does not exist create a new one
			stripeCustomer = await stripe.customers.create(
				{
					name: customer.name,
					phone: customer.phone, // optional
					email: customer.email, // optional
				},
				{
					stripeAccount: stripeAccountId,
				}
			);

			// save the stripeCustomerId to our database
			await Customer.findOneAndUpdate(
				{
					_id: customer._id,
					_business,
				},
				{
					stripeCustomerId: stripeCustomer.id,
				}
			).lean();
		}

		return stripeCustomer;
	};

	/**
	 * Get all the invoices
	 *
	 * GET /api/payments/invoices-all
	 *
	 * response body:
	 * {
	 *  	invoices: array (see invoice formatted)
	 *		totalCount: number
	 * }
	 *
	 */

	app.get(
		'/api/payments/invoices-all',
		requireLogin,
		requireStripeAccount,
		async (req, res) => {
			try {
				let totalPaymentIntents = [];

				const _business = req.user._id;

				const businessSettings = await BusinessSettings.findOne({
					_business,
				}).lean();

				const { stripeAccountId } = businessSettings;

				// get max amount of payment intents
				let paymentIntents = await stripe.paymentIntents.list(
					{
						limit: 100,
						expand: ['data.customer', 'data.payment_method'],
					},
					{
						stripeAccount: stripeAccountId,
					}
				);

				totalPaymentIntents = paymentIntents.data;
				let startingAfter =
					paymentIntents.data[paymentIntents.data.length - 1].id;

				// if there are more get them all

				while (paymentIntents.has_more) {
					// eslint-disable-next-line no-await-in-loop
					paymentIntents = await stripe.paymentIntents.list(
						{
							limit: 100,
							starting_after: startingAfter,
							expand: ['data.customer', 'data.payment_method'],
						},
						{
							stripeAccount: stripeAccountId,
						}
					);
					totalPaymentIntents = [
						...totalPaymentIntents,
						...paymentIntents.data,
					];
					startingAfter =
						paymentIntents.data[paymentIntents.data.length - 1].id;
				}

				return res.status(200).send({
					invoices: totalPaymentIntents,
					totalCount: totalPaymentIntents.length,
				});
			} catch (err) {
				sendErrorEmail(
					FILE_NAME,
					'payments/invoices',
					err,
					req && req.user && req.user.username
				);
				console.log(err);

				return res.status(500).send({ error: true });
			}
		}
	);

	/**
	 * Check to see if business has connected their stripe account
	 *  * POST /api/payments/has-stripe-account
	 *
	 * response
				hasStripeAccount: boolean
	 */
	app.post(
		'/api/payments/has-stripe-account',
		requireLogin,
		async (req, res) => {
			try {
				const _business = req.user._id;

				const businessSettings = await BusinessSettings.findOne({
					_business,
				}).lean();

				if (!businessSettings) {
					return res.send({
						hasStripeAccount: false,
					});
				}

				const { stripeAccountId } = businessSettings;

				if (stripeAccountId) {
					return res.send({ hasStripeAccount: true });
				}

				return res.send({ hasStripeAccount: false });
			} catch (err) {
				return res.status(500).send({
					error: true,
					message: 'No stripe account connected.',
				});
			}
		}
	);

	/**
	 * Check to see if business has connected the onboarding process
	 *  POST /api/payments/has-details-submitted
	 *
	 * response
				hasDetailsSubmitted: boolean
	 */
	app.get(
		'/api/payments/has-details-submitted',
		requireLogin,
		async (req, res) => {
			try {
				const _business = req.user._id;

				const businessSettings = await BusinessSettings.findOne({
					_business,
				}).lean();

				if (!businessSettings) {
					await Business.findOneAndUpdate(
						{ _id: _business },
						{
							stripeAccountIsConnected: false,
						}
					);

					return res.send({
						hasDetailsSubmitted: false,
					});
				}

				const { stripeAccountId } = businessSettings;

				if (!stripeAccountId) {
					await Business.findOneAndUpdate(
						{ _id: _business },
						{
							stripeAccountIsConnected: false,
						},
						{ new: true }
					);

					return res.send({
						hasDetailsSubmitted: false,
					});
				}

				const account = await stripe.accounts.retrieve(
					stripeAccountId,
					{ stripeAccount: stripeAccountId }
				);

				if (!account) {
					return res.send({
						hasDetailsSubmitted: false,
					});
				}

				await Business.findOneAndUpdate(
					{ _id: _business },
					{
						stripeAccountIsConnected: account.details_submitted,
					}
				);

				return res.send({
					hasDetailsSubmitted: account.details_submitted,
				});
			} catch (err) {
				console.log(err);
				return res.status(500).send({
					error: true,
					message: 'No stripe account connected.',
				});
			}
		}
	);

	/**
	 * Create an invoice.
	 *
	 * POST /api/payments/create-invoice
	 *
	 * request body:
	 * {
	 * 		amount: Number,
	 * 		referenceNumber: String, (may be optional)
	 * 		_customer: ObjectId
	 * TODO: make prettier
	 * amount,
				referenceNumber: reference,
				description,
				language,
				_customer,
				customerName: name,
				customerPhoneEmail: phoneEmail,
	 * }
	 */
	app.post(
		'/api/payments/create-invoice',
		requireLogin,
		requireStripeAccount,
		async (req, res) => {
			try {
				const _business = req.user._id;
				const { accessLevel } = req.user.user;

				const userControlLevels = [
					'owner',
					'location-admin',
					'team-leader',
					'team-member',
					'contributor',
				];

				//check if they do not have the correct access level
				if (!userControlLevels.includes(accessLevel)) {
					return res.status(400).send({
						error: true,
						message: 'Unauthorized user',
					});
				}

				const businessSettings = await BusinessSettings.findOne({
					_business,
				}).lean();
				const { stripeAccountId } = businessSettings;

				const {
					amount,
					referenceNumber,
					description,
					language,
					_customer,
					customerPhoneEmail,
					customerName,
				} = req.body;

				let phone, email;

				// check for parameters
				if (
					!amount ||
					typeof amount !== 'string' ||
					typeof referenceNumber !== 'string' ||
					typeof description !== 'string'
				) {
					return res.status(500).send({
						error: true,
						message: 'need correct parameters',
					});
				}
				let customer;

				customer = await Customer.findOne({ _id: _customer }).lean();

				// if customer does not exist, then create a new customer
				if (!customer) {
					// handle email case
					if (customerPhoneEmail.includes('@')) {
						// or handle phone case
						email = customerPhoneEmail;
					} else {
						phone = customerPhoneEmail;
					}

					if (phone) {
						const formattedPhone = formatPhoneForTwilio(phone);
						customer = await findOrCreateCustomer({
							phone: formattedPhone,
							name: customerName,
							_business,
						});
					} else if (email) {
						customer = await findOrCreateCustomerFromEmail({
							email,
							name: customerName,
							_business,
						});
					} else {
						return res.status(400).send({
							error: true,
							message: 'Error creating customer',
						});
					}
				}

				const { phone: customerPhone, facebookUserId } = customer;

				// if they are sending a payment request to a facebook user don't let them
				if (facebookUserId && !customerPhone) {
					return res.status(500).send({
						error: true,
						message: 'Sending payment request to facebook',
					});
				}

				// check if customer has a stripeCustomerId associated to it and retrieve it, if not create a new one
				const { stripeCustomerId } = customer;

				const stripeCustomer = await findOrCreateStripeCustomer({
					stripeCustomerId,
					stripeAccountId,
					customer,
					_business: req.user._id,
				});

				// add amount in cents for stripe
				// if 100 -> make it 10000. if 100.00 -> 10000
				const formattedAmount = amount.includes('.')
					? amount.replace('.', '')
					: amount.concat('00');

				const stripeAccount = await stripe.accounts.retrieve(
					stripeAccountId
				);

				const { default_currency: defaultCurrency } = stripeAccount;
				// create a payment intent
				const paymentIntent = await stripe.paymentIntents.create(
					{
						amount: formattedAmount,
						customer: stripeCustomer.id, // associate the payment intent to this customer
						currency: defaultCurrency,
						// payment_method_types: ['card'],
						description,
						metadata: {
							integration_check: 'accept_a_payment',
							reference_number: referenceNumber,
						},
					},
					{ stripeAccount: stripeAccountId }
				);
				// save the invoice to the database
				const invoice = await Invoice.create({
					referenceNumber,
					paymentIntentId: paymentIntent.id,
					_customer: customer._id, // customer on our db
					_user: req.user.user._id, // user on our db
					_business: req.user._id,
				});
				const { paymentsUrl } = keys;

				let longInvoiceUrl = `${paymentsUrl}/invoices/${invoice._id}`;

				if (language && language !== 'en') {
					longInvoiceUrl = `${longInvoiceUrl}?language=${language}`;
				}

				const invoiceUrl = await shortenPaymentsUrl(longInvoiceUrl);
				return res.status(200).send({ invoiceUrl, customer });
			} catch (err) {
				console.log(err);
				return res.status(400).send({ error: true });
			}
		}
	);

	/*
	 * Update invoice. Update a specific paramter of the invoice
	 *
	 * POST /api/payments/update-payment-intent
	 *
	 * request body: {
	 *	_payment: ObjectId
	 *  type: reference OR description
	 *  value: (amount to be updated) will be a reference number or a description
	 *}
	 *
	 * response body: {
	 * paymentIntent: Object
	 *}
	 */

	app.post(
		'/api/payments/update-payment-intent',
		requireLogin,
		requireStripeAccount,
		async (req, res) => {
			try {
				const { paymentIntentId, type, value } = req.body;

				if (!paymentIntentId || !type || !value) {
					return res.status(500).send({
						error: true,
						message: 'Need proper parameters to update invoice.',
					});
				}

				const _business = req.user._id;
				const businessSettings = await BusinessSettings.findOne({
					_business,
				}).lean();

				const { stripeAccountId } = businessSettings;

				let paymentIntent;

				if (type === 'reference') {
					await Invoice.findOneAndUpdate(
						{
							paymentIntentId,
						},
						{
							referenceNumber: value,
						}
					);

					paymentIntent = await stripe.paymentIntents.update(
						paymentIntentId,
						{
							metadata: { reference_number: value },
						},
						{
							stripeAccount: stripeAccountId,
						}
					);
				}

				if (type === 'description') {
					paymentIntent = await stripe.paymentIntents.update(
						paymentIntentId,
						{
							description: value,
						},
						{
							stripeAccount: stripeAccountId,
						}
					);
				}

				// retrieve payment so we can expand customer and payment method objects
				paymentIntent = await stripe.paymentIntents.retrieve(
					paymentIntentId,
					{
						expand: ['customer', 'payment_method'],
					},
					{
						stripeAccount: stripeAccountId,
					}
				);

				return res.status(200).send({ paymentIntent });
			} catch (err) {
				// sendErrorEmail(
				// 	FILE_NAME,
				// 	'payments/update-payment-intent',
				// 	err,
				// 	req && req.user && req.user.username
				// );
				console.log(err);
				return res.status(500).send({ error: true });
			}
		}
	);
};
