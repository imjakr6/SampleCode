import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
	Left,
	Icon,
	List,
	ListItem,
	Button,
	Content,
	Card,
	CardItem,
	Body,
	Text,
	Spinner,
	View,
	Right,
} from 'native-base';
import { Actions } from 'react-native-router-flux';
import { Modal, Platform, Alert, AppState, Animated } from 'react-native';
import Dialog from 'react-native-dialog';
import axios from 'axios';
import _ from 'lodash';
import {
	updateSingleInvoice,
	fetchInvoices,
	fetchRecentInvoices,
	getNextInvoices,
} from '../../actions';
import { apiUri } from '../../config/keys';
import formatAmount from '../../utils/payments/formatAmount';
import formatInvoices from '../../utils/payments/formatInvoices';
import { determineRefund } from '../../utils/payments/determineFees';

// ---------------------------------STYLES---------------------------------
const tableTextStyle = { margin: 6 };
const CHEKKIT_GREEN = '#03B856';
const CANCEL_RED = '#d9534f';
const REFUND_BLUE = '#62B1F6';

const textNoteStyle = {
	fontSize: 14,
	color: 'rgba(128, 128, 128, 1)',
	fontWeight: '400',
	marginLeft: 10,
	marginRight: 10,
};

const titleStyle = {
	paddingBottom: 4,
};

const viewMoreButton = { fontSize: 15 };
// ---------------------------------STYLES---------------------------------

class InvoiceTable extends Component {
	state = {
		currentInvoice: {}, // this is the current invoice selected when clicking on an invoices from the table
		error: false,
		loading: false,
		loadingMoreInvoices: false, // used for the load more button
		invoiceLoading: false, // this is when we cancel or refund an invoice
		showInvoicePopUp: false, // brings up the modal for the invoice information
		showRefundAlert: false, 
		showCancelAlert: false,
		fadeAnim: new Animated.Value(1),
		refundAmount: '',
		appState: AppState.currentState,
	};

	async componentDidMount() {
		await this.getInvoices();
		AppState.addEventListener('change', this._handleAppStateChange);
	}

	componentWillUnmount() {
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	// if we are on table get 3, if we are on dashboard get 10
	getInvoices = async () => {
		try {
			this.setState({ loading: true });

			if (this.props.renderDashboard) {
				await this.props.fetchInvoices();
			} else {
				await this.props.fetchRecentInvoices();
			}

			this.setState({
				loading: false,
			});
		} catch (err) {
			this.setState({ error: true, loading: false });
		}
	};

	// get the refund amount to use for auto complete in refund
	getRefundAmount = (invoice) => {
		if (!invoice) {
			return null;
		}

		const currentRefund = determineRefund(invoice);
		const { amount } = invoice;

		let refundAmount;

		if (currentRefund) {
			refundAmount = amount - currentRefund;
		} else {
			refundAmount = amount;
		}

		const partOne = refundAmount
			.toString()
			.substring(0, refundAmount.toString().length - 2);

		const partTwo = refundAmount
			.toString()
			.substring(refundAmount.toString().length - 2);

		if (refundAmount < 100) {
			return `0.${partTwo}`;
		}
		return `${partOne}.${partTwo}`;
	};

	fadeIn = () => {
		// Will change fadeAnim value to 1 in 0.25 seconds
		Animated.timing(this.state.fadeAnim, {
			toValue: 1,
			duration: 250,
		}).start();
	};

	fadeOut = () => {
		// Will change fadeAnim value to 0 in 2 seconds
		Animated.timing(this.state.fadeAnim, {
			toValue: 0,
			duration: 2000,
		}).start();
	};

	// handle refresh when minimizing the app
	_handleAppStateChange = (nextAppState) => {
		if (
			this.state.appState.match(/inactive|background/) &&
			nextAppState === 'active'
		) {
			this.props.fetchInvoices();
		}
		this.setState({ appState: nextAppState });
	};

	isEmpty = (obj) => _.isEmpty(obj);

	// cancels the current invoice
	cancelInvoice = async () => {
		try {
			this.setState({ invoiceLoading: true });

			const res = await axios.post(`${apiUri}/api/payments/cancel`, {
				paymentIntentId: this.state.currentInvoice.id,
			});

			const { data } = res;
			if (data && data.error) {
				this.setState({ invoiceLoading: false });
				return Alert.alert(
					'Error',
					'Could not cancel payment, please try again.',
					[
						{
							text: 'OK',
							onPress: () =>
								this.setState({ showCancelAlert: false }),
						},
					]
				);
			}
			const { paymentIntent } = data;
			// update invoice Store with the new updated invoice
			await this.props.updateSingleInvoice(
				this.props.invoices,
				paymentIntent
			);

			const currentInvoice = paymentIntent;

			this.setState({
				invoiceLoading: false,
				currentInvoice,
			});

			Alert.alert('Success', 'Canceled invoice.', [
				{
					text: 'OK',
					onPress: () => this.setState({ showCancelAlert: false }),
				},
			]);
		} catch (err) {
			console.log('Cancel invoice error', err);

			this.setState({ invoiceLoading: false });
			Alert.alert('Error', 'Could not cancel invoice.', [
				{
					text: 'OK',
					onPress: () => this.setState({ showCancelAlert: false }),
				},
			]);
		}
	};

	submitRefund = async (value) => {
		try {
			let refundToSend = value;

			if (value) {
				if (value < 0.01 || value > 999999.99) {
					return;
				}
				if (!value.includes('.')) {
					// stripe allows a maximum of eight digits
					// if they are not using a decimal only use 6 digits (2 for decimal)
					if (value.length > 6 || isNaN(value)) {
						return;
					}
				}

				// if they are using a decimal make sure it is in correct spot (give 1 extra decimal so they can refund the extra rounded decimal)
				if (value.includes('.')) {
					if (value.length > 9) {
						return;
					}

					const regex = /^\d+(?:\.\d{0,2})$/;
					if (!regex.test(value)) {
						return;
					}
					// this will ensure correct decimal places
					refundToSend = Number.parseFloat(value).toFixed(2);
				}
			}

			this.setState({ invoiceLoading: true });
			const res = await axios.post(`${apiUri}/api/payments/refund`, {
				paymentIntentId: this.state.currentInvoice.id,
				amount: refundToSend,
			});

			const { data } = res;

			if (data && data.error) {
				this.setState({ invoiceLoading: false });
				return Alert.alert(
					'Error',
					'Could not refund payment, please try again.',
					[
						{
							text: 'OK',
							onPress: () =>
								this.setState({ showRefundAlert: false }),
						},
					]
				);
			}

			const { paymentIntent } = data;

			// update invoice Store with the new updated invoice
			await this.props.updateSingleInvoice(
				this.props.invoices,
				paymentIntent // need to change this
			);
			const currentInvoice = formatInvoices({
				invoices: [paymentIntent],
			})[0];

			this.setState({
				invoiceLoading: false,
				currentInvoice,
			});

			Alert.alert('Success', 'Refunded invoice.', [
				{
					text: 'OK',
					onPress: () => this.setState({ showRefundAlert: false }),
				},
			]);
		} catch (err) {
			this.setState({ invoiceLoading: false });
			Alert.alert(
				'Error',
				'Could not refund invoice. Ensure you are not refunding more than the total amount.',
				[
					{
						text: 'OK',
						onPress: () =>
							this.setState({ showRefundAlert: false }),
					},
				]
			);
		}
	};

	// used to transition from Invoice table(3 invoices) to Invoice Dashboard (all invoices)
	// eslint-disable-next-line class-methods-use-this
	handleViewMoreInvoices = async () => {
		Actions.invoices();
	};

	// used to get 10 more invoices on the Invoice Dashboard
	handleMoreInvoices = async () => {
		this.setState({ loadingMoreInvoices: true });
		await this.props.getNextInvoices(
			this.props.invoices[this.props.invoices.length - 1].id
		);
		this.setState({ loadingMoreInvoices: false });
	};
	// used to show the modal containing the information for an invoice
	handleInvoicePopUp = (theInvoice) => {
		this.setState({
			showInvoicePopUp: true,
			currentInvoice: theInvoice,
		});
	};
	// used to show the refund alert for refunding an invoice
	handleRefundAlert = () => {
		this.setState({
			refundAmount: this.getRefundAmount(this.state.currentInvoice),
			showRefundAlert: !this.state.showRefundAlert,
		});
	};
	// used to show the cancel alert for canceling an invoice
	handleCancelAlert = () => {
		this.setState({ showCancelAlert: !this.state.showCancelAlert });
	};
	// used to set the refund amount entered while refunding an invoice
	handleRefundAmount = (value) => {
		// stripe allows a maximum of eight digits
		// if they are not using a decimal only use 6 digits (2 for decimal)
		if (!value.includes('.')) {
			if (value.length > 6 || isNaN(value)) {
				return;
			}
		}

		// if they are using a decimal make sure it is in correct spot
		if (value.includes('.')) {
			if (value.length > 9) {
				return;
			}
			const regex = /^\d+(?:\.\d{0,2})$/;
			if (!regex.test(value)) {
				return;
			}
		}

		this.setState({ refundAmount: value });
	};

	renderLoading = () => <Spinner />;

	renderError = () => (
		<Text style={tableTextStyle}>
			There was an error loading your data. If the problem persists,
			please contact customer support through the contact us page in the
			Account Settings.
		</Text>
	);

	// render the alert to confirm refunding an invoice (need to enter the refund amount
	// uses custom alert box Dialog
	renderRefundAlert = () => {
		return (
			<View>
				<Dialog.Container visible={this.state.showRefundAlert}>
					<Dialog.Title>Refund payment</Dialog.Title>
					<Dialog.Description>
						Refunds take 5-10 days to appear on customer&apos;s
						statement.
					</Dialog.Description>
					<Dialog.Input
						keyboardType="numeric"
						style={
							Platform.OS === 'android' && {
								borderBottomWidth: 1,
							}
						}
						placeholder="Amount"
						onChangeText={(value) => {
							this.handleRefundAmount(value);
						}}
						value={this.state.refundAmount}
					/>

					{this.state.invoiceLoading && <Spinner />}
					<Dialog.Button
						disabled={this.state.invoiceLoading}
						label="Cancel"
						style={{ fontWeight: 'bold' }}
						onPress={this.handleRefundAlert}
					/>
					<Dialog.Button
						disabled={this.state.invoiceLoading}
						label="Refund"
						onPress={() => {
							this.submitRefund(
								this.state.refundAmount
									? this.state.refundAmount
									: this.getRefundAmount(
											this.state.currentInvoice
									  )
							);
						}}
					/>
				</Dialog.Container>
			</View>
		);
	};
	// render the alert to confirm canceling an invoice (need to enter the refund amount
	renderCancelAlert = () => {
		return (
			<View>
				<Dialog.Container visible={this.state.showCancelAlert}>
					<Dialog.Title>Cancel payment</Dialog.Title>
					<Dialog.Description>
						Are you sure you want to Cancel this payment?
					</Dialog.Description>
					{this.state.invoiceLoading ? <Spinner /> : null}
					<Dialog.Button
						disabled={this.state.invoiceLoading}
						label="Cancel"
						style={{ fontWeight: 'bold' }}
						onPress={this.handleCancelAlert}
					/>
					<Dialog.Button
						disabled={this.state.invoiceLoading}
						label="Ok"
						onPress={this.cancelInvoice}
					/>
				</Dialog.Container>
			</View>
		);
	};

	// render the cancel or refund button at the bottom of the invoice information modal
	renderCancelOrRefundButton = (theStatus) => {
		const { accessLevel } = this.props.user.user;
		const userControlLevels = ['owner', 'location-admin', 'team-leader'];

		// if they don't have correct permission have button call the toast
		if (!userControlLevels.includes(accessLevel)) {
			if (theStatus === 'Sent') {
				return (
					<View style={{ paddingHorizontal: 4 }}>
						<Button
							disabled={this.state.invoiceLoading}
							block
							onPress={() => {
								this.setState({
									showImproperAccessMessage: true,
								});

								this.fadeIn();

								setTimeout(() => {
									this.fadeOut();
								}, 1000);
							}}
							style={{ backgroundColor: CANCEL_RED }}
						>
							<Text>Cancel Payment</Text>
						</Button>

						{this.state.showImproperAccessMessage && (
							<Animated.View
								style={{
									opacity: this.state.fadeAnim, // Bind opacity to animated value
								}}
							>
								<Button
									transparent
									onPress={this.fadeOut}
									style={{
										backgroundColor: 'black',
										padding: 10,
										height: 60,
										marginTop: 10,
									}}
								>
									<Text style={{ color: 'white' }}>
										Please contact your administrator to
										cancel a payment.
									</Text>
									<View style={{ flexDirection: 'row' }} />
								</Button>
							</Animated.View>
						)}

						{this.renderCancelAlert()}
					</View>
				);
			} else if (theStatus === 'Paid' || theStatus === 'Partial Refund') {
				return (
					<View style={{ paddingHorizontal: 4 }}>
						<Button
							onPress={() => {
								this.setState({
									showImproperAccessMessage: true,
								});

								this.fadeIn();

								setTimeout(() => {
									this.fadeOut();
								}, 1000);
							}}
							disabled={this.state.invoiceLoading}
							block
							style={{ backgroundColor: REFUND_BLUE }}
						>
							<Text>Refund Payment</Text>
						</Button>

						{this.state.showImproperAccessMessage && (
							<Animated.View
								style={{
									opacity: this.state.fadeAnim, // Bind opacity to animated value
								}}
							>
								<Button
									transparent
									onPress={this.fadeOut}
									style={{
										backgroundColor: 'black',
										padding: 10,
										height: 60,
										marginTop: 10,
									}}
								>
									<Text style={{ color: 'white' }}>
										Please contact your administrator to
										refund a payment.
									</Text>
									<View style={{ flexDirection: 'row' }} />
								</Button>
							</Animated.View>
						)}

						{this.renderRefundAlert()}
					</View>
				);
			}
		}

		if (theStatus === 'Sent') {
			return (
				<View style={{ paddingHorizontal: 4 }}>
					<Button
						disabled={this.state.invoiceLoading}
						block
						onPress={this.handleCancelAlert}
						style={{ backgroundColor: CANCEL_RED }}
					>
						<Text>Cancel Payment</Text>
					</Button>
					{this.renderCancelAlert()}
				</View>
			);
		} else if (theStatus === 'Paid' || theStatus === 'Partial Refund') {
			return (
				<View style={{ paddingHorizontal: 4 }}>
					<Button
						disabled={this.state.invoiceLoading}
						block
						onPress={this.handleRefundAlert}
						style={{ backgroundColor: REFUND_BLUE }}
					>
						<Text>Refund Payment</Text>
					</Button>
					{this.renderRefundAlert()}
				</View>
			);
		}
	};

	// renders the specific icon based on the invoice status
	renderIcon = (invoice) => {
		if (invoice.statusFormatted === 'Sent') {
			return (
				<View
					style={{
						marginLeft: 8,
						marginTop: 3,
						marginBottom: 3,
						borderRadius: 20,
						width: 70,
						backgroundColor: '#f7ef99',
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					<Icon
						active
						name="access-time"
						type="MaterialIcons"
						style={{
							color: '#bb682e',
							width: 15,
							height: 15,
							fontSize: 15,
							marginLeft: 8,
						}}
					/>
					<Text
						style={{
							color: '#bb682e',
						}}
					>
						{' '}
						Sent
					</Text>
				</View>
			);
		} else if (invoice.statusFormatted === 'Paid') {
			return (
				<View
					style={{
						marginLeft: 8,
						marginTop: 4,
						marginBottom: 3,
						borderRadius: 20,
						width: 70,
						backgroundColor: '#d6ecff',
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					<Icon
						active
						name="check"
						type="FontAwesome"
						style={{
							color: '#5469d4',
							width: 15,
							height: 15,
							fontSize: 15,
							marginLeft: 8,
						}}
					/>
					<Text
						style={{
							color: '#5469d4',
						}}
					>
						{' '}
						Paid
					</Text>
				</View>
			);
		} else if (invoice.statusFormatted === 'Canceled')
			return (
				<View
					style={{
						marginLeft: 8,
						marginTop: 4,
						marginBottom: 3,
						borderRadius: 20,
						width: 105,
						backgroundColor: '#e3e8ee',
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					<Icon
						active
						name="close"
						type="AntDesign"
						style={{
							width: 15,
							height: 15,
							fontSize: 15,
							marginLeft: 8,
						}}
					/>
					<Text> Canceled</Text>
				</View>
			);
		else if (invoice.statusFormatted === 'Refunded') {
			return (
				<View
					style={{
						marginLeft: 8,
						marginTop: 4,
						marginBottom: 3,
						borderRadius: 20,
						width: 90,
						backgroundColor: '#e3e8ee',
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					<Icon
						active
						name="undo"
						type="MaterialCommunityIcons"
						style={{
							color: '#4f566b',
							width: 15,
							height: 15,
							fontSize: 15,
							marginLeft: 8,
						}}
					/>
					<Text
						style={{
							color: '#4f566b',
						}}
					>
						{' '}
						Refund
					</Text>
				</View>
			);
		} else if (invoice.statusFormatted === 'Partial Refund') {
			return (
				<View
					style={{
						marginLeft: 8,
						marginTop: 4,
						borderRadius: 20,
						width: 135,
						backgroundColor: '#e3e8ee',
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					<Icon
						active
						name="undo"
						type="MaterialCommunityIcons"
						style={{
							color: '#4f566b',
							width: 15,
							height: 15,
							fontSize: 15,
							marginLeft: 8,
						}}
					/>
					<Text
						style={{
							color: '#4f566b',
						}}
					>
						{' '}
						Partial Refund
					</Text>
				</View>
			);
		}
	};

	// render the invoices as list items in the table
	renderListItems = (invoice) => (
		<ListItem
			key={invoice.id}
			onPress={() => this.handleInvoicePopUp(invoice)}
		>
			<Body>
				<Text style={{ fontWeight: 'bold' }}>
					{invoice.amountFormatted}
					{'  •  '}
					{`#${invoice.metadata.reference_number}`}
				</Text>
				{this.renderIcon(invoice)}
				<Text style={textNoteStyle} numberOfLines={1}>
					{invoice.customer && invoice.customer.name}
					{'  •  '}
					{invoice.customer && invoice.customer.phoneFormatted}
				</Text>
				<Text style={textNoteStyle}>{invoice.createdFormatted}</Text>
			</Body>

			<Right>
				<Button
					dark
					transparent
					onPress={() => this.handleInvoicePopUp(invoice)}
				>
					<Icon active name="arrow-forward" />
				</Button>
			</Right>
		</ListItem>
	);

	renderLoadMoreButton = (invoices, renderDashboard) => {
		// determine if the button is used for the dashboard or the table
		if (renderDashboard) {
			// if there are more invoices render the load more button
			if (this.props.hasMore) {
				return (
					<Button
						light
						disabled={this.state.loadingMoreInvoices}
						onPress={this.handleMoreInvoices}
					>
						<Text style={viewMoreButton}>View more invoices</Text>
					</Button>
				);
			}
			// else there are no more so don't render any button
			return;
		}

		// if there are more than 3 invoices allow them to load more
		if (invoices.length >= 3) {
			return (
				<Button
					light
					disabled={this.state.loadingMoreInvoices}
					onPress={this.handleViewMoreInvoices}
				>
					<Text style={viewMoreButton}>View more invoices</Text>
				</Button>
			);
		}
	};

	// render the table containing the invoices
	renderTable = () => {
		const { invoices, renderDashboard } = this.props;

		return (
			<Content>
				<List
					style={{
						display: 'flex',
						justifyContent: 'space-around',
					}}
				>
					{/* only ever show 3 invoices for recent invoices */}
					{renderDashboard
						? invoices.map((invoice) =>
								this.renderListItems(invoice)
						  )
						: invoices
								.slice(0, 3)
								.map((invoice) =>
									this.renderListItems(invoice)
								)}
					{this.renderLoadMoreButton(invoices, renderDashboard)}
				</List>
			</Content>
		);
	};

	// add the refunded amount to the rendered invoice information modal (only for refunds)
	renderRefundAmount = (theInvoice) => {
		if (
			theInvoice.statusFormatted === 'Refunded' ||
			theInvoice.statusFormatted === 'Partial Refund'
		) {
			return (
				<ListItem key="refundAmount">
					<Left>
						<Text>Refunded</Text>
					</Left>
					<Text>
						{formatAmount({
							amount: theInvoice.charges.data[0].amount_refunded,
							currency: theInvoice.charges.data[0].currency,
						})}
					</Text>
				</ListItem>
			);
		}
	};

	renderFee = (invoice) => {
		if (
			invoice.statusFormatted === 'Paid' ||
			invoice.statusFormatted === 'Refunded' ||
			invoice.statusFormatted === 'Partial Refund'
		)
			return (
				<ListItem key="invoiceFee">
					<Left>
						<Text>Fee</Text>
					</Left>

					<Text> {invoice && invoice.stripeFee}</Text>
				</ListItem>
			);
	};

	renderNet = (invoice) => {
		if (
			invoice.statusFormatted === 'Paid' ||
			invoice.statusFormatted === 'Refunded' ||
			invoice.statusFormatted === 'Partial Refund'
		)
			return (
				<ListItem key="invoiceNet">
					<Left>
						<Text>Net</Text>
					</Left>

					<Text> {invoice && invoice.netFormatted}</Text>
				</ListItem>
			);
	};

	// add the payment method (card) to the rendered invoice information modal (only used after invoice has been paid)
	renderPaymentMethod = (theInvoice) => {
		if (theInvoice.paymentMethod) {
			return (
				<ListItem key="paymentMethod">
					<Left>
						<Text>Payment Method</Text>
					</Left>

					<Text>
						{theInvoice.paymentMethod.card.brand
							.substring(0, 1)
							.toUpperCase() +
							theInvoice.paymentMethod.card.brand.substring(1)}
						{' •••• '}
						{theInvoice.paymentMethod.card.last4}
					</Text>
				</ListItem>
			);
		}
	};

	// the extra information for an invoice
	renderModal = () => {
		const { currentInvoice } = this.state;
		if (!this.isEmpty(currentInvoice)) {
			return (
				<View>
					<Modal
						animationType="slide"
						visible={this.state.showInvoicePopUp}
					>
						<Card style={{ marginTop: 24 }}>
							<View>
								<CardItem header>
									<Button
										transparent
										icon
										style={{
											position: 'absolute',
											backgroundColor: 'transparent',
										}}
										onPress={() => {
											this.setState({
												showInvoicePopUp: false,
											});
										}}
									>
										<Text>
											{Platform.OS === 'android' ? (
												<Icon
													style={{
														color: CHEKKIT_GREEN,
													}}
													name="arrow-back"
													type="MaterialIcons"
												/>
											) : (
												<Icon
													style={{
														color: CHEKKIT_GREEN,
													}}
													name="arrow-back"
													type="MaterialIcons"
												/>
											)}
										</Text>
									</Button>

									<Text style={{ marginLeft: 40 }}>
										Payment Details
									</Text>
									<Text>
										{currentInvoice.customerName
											? currentInvoice.customerName
											: null}
									</Text>
								</CardItem>
							</View>

							<View>
								<List>
									<ListItem key="invoiceDate">
										<Left>
											<Text>Date</Text>
										</Left>

										<Text>
											{currentInvoice.createdFormatted}
										</Text>
									</ListItem>
									<ListItem key="customer">
										<Left>
											<Text>Customer</Text>
										</Left>

										<Text>
											{currentInvoice.customer.name}
										</Text>
									</ListItem>

									<ListItem key="invoiceAmount">
										<Left>
											<Text>Amount</Text>
										</Left>

										<Text>
											{currentInvoice.amountFormatted}
										</Text>
									</ListItem>
									{this.renderRefundAmount(currentInvoice)}
									{this.renderFee(currentInvoice)}
									{this.renderNet(currentInvoice)}
									<ListItem key="invoiceStatus">
										<Left>
											<Text>Status</Text>
										</Left>

										<Text>
											{currentInvoice.statusFormatted}
										</Text>
									</ListItem>
									<ListItem>
										<Left>
											<Text>Reference</Text>
										</Left>

										<Text>
											#
											{
												currentInvoice.metadata
													.reference_number
											}
										</Text>
									</ListItem>
									<ListItem>
										<Left>
											<Text>Description</Text>
										</Left>

										<Text>
											{currentInvoice.description}
										</Text>
									</ListItem>
									{this.renderPaymentMethod(currentInvoice)}
								</List>
							</View>
						</Card>

						{this.renderCancelOrRefundButton(
							currentInvoice.statusFormatted
						)}
					</Modal>
				</View>
			);
		}
	};

	// will render the invoice table if there are invoices to render
	renderInvoices = () => {
		const { invoices } = this.props;

		if (invoices && invoices.length === 0) {
			return (
				<List>
					<Text style={tableTextStyle}>
						No Invoices yet. Send out your first invoice using the
						Messenger tab.
					</Text>
				</List>
			);
		}

		return (
			<View>
				{this.renderTable()}
				{this.renderModal()}
			</View>
		);
	};

	render() {
		const { error, loading } = this.state;
		return (
			<Card>
				<View>
					<CardItem header style={titleStyle}>
						{this.props.renderDashboard ? null : (
							<Text>Recent Invoices</Text>
						)}
					</CardItem>
				</View>
				{
					// eslint-disable-next-line no-nested-ternary
					error
						? this.renderError()
						: loading
						? this.renderLoading()
						: this.renderInvoices()
				}
			</Card>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		invoices: state.payments.invoices,
		user: state.user,
		hasMore: state.payments.hasMore,
	};
};

export default connect(mapStateToProps, {
	updateSingleInvoice,
	fetchInvoices,
	fetchRecentInvoices,
	getNextInvoices,
})(InvoiceTable);
