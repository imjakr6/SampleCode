import React, { Component } from 'react';
import { connect } from 'react-redux';
import PopupState, { bindTrigger, bindMenu } from 'material-ui-popup-state';
import Select from '@material-ui/core/Select';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Collapse from '@material-ui/core/Collapse';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import FilterListIcon from '@material-ui/icons/FilterList';
import SubdirectoryArrowRightIcon from '@material-ui/icons/SubdirectoryArrowRight';
import { MuiPickersUtilsProvider, DatePicker } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import moment from 'moment';

import isEmpty from '../../utils/isEmpty';
import {
	fetchAllInvoices,
	setInvoices,
	fetchAllCustomerInvoices,
	setCustomerInvoices,
} from '../../actions/payments';

const checkboxStyle = { paddingTop: 0, paddingBottom: 0, paddingLeft: 5 };

const DEFAULT_DATE_FILTER = 'isInTheLast';
const DEFAULT_DAYS_MONTHS_FILTER = 'days';
const DEFAULT_AMOUNT_FILTER = 'equals';
const DEFAULT_REFERENCE_NUMBER = '';
const DEFAULT_DESCRIPTION = '';

const DEFAULT_STATE = {
	amountFilter: DEFAULT_AMOUNT_FILTER,
	dateFilter: DEFAULT_DATE_FILTER,
	daysMonthsFilter: DEFAULT_DAYS_MONTHS_FILTER,
	referenceNumber: DEFAULT_REFERENCE_NUMBER,
	description: DEFAULT_DESCRIPTION,
	selectedDate: new Date(),
	selectedDate2: new Date(),
	amount: '',
	amount2: '',
	daysMonths: '',
	status: {
		partialRefund: false,
		paid: false,
		refunded: false,
		sent: false,
		canceled: false,
	},
	openDateMenu: false,
	openAmountMenu: false,
	openStatusMenu: false,
	usingFilter: false,
};

class InvoiceFilterMenu extends Component {
	state = DEFAULT_STATE;

	// if we reset the filter from the parent reset it here
	componentWillReceiveProps() {
		if (this.props.clearAllFilters) {
			this.setState(DEFAULT_STATE, () =>
				this.setState({
					status: {
						partialRefund: false,
						paid: false,
						refunded: false,
						sent: false,
						canceled: false,
					},
				})
			);
		}
	}

	clearAllFilters = async (popupState) => {
		// the filter has been cleared set the invoices immediately
		// It is possible that we have loaded all invoices in, and we are viewing by customer but have not actually filtered by customer
		if (
			// if we don't have customer invoices or all invoices we haven't filtered so just reset filter
			isEmpty(this.props.allInvoices) &&
			isEmpty(this.props.allCustomerInvoices)
		) {
			// reset the filter
			this.setState(DEFAULT_STATE, () =>
				this.setState({
					status: {
						partialRefund: false,
						paid: false,
						refunded: false,
						sent: false,
						canceled: false,
					},
				})
			);
			return;
			// else if there are no customer invoices  we use all the invoices (customer filter will be empty when reset)
		} else if (
			isEmpty(this.props.allCustomerInvoices) &&
			isEmpty(this.props.customerInvoices)
		) {
			this.props.setInvoices(
				this.props.allInvoices,
				this.props.allInvoices.length
			);
			// else if we have all customers we have filtered by customer, return them
		} else if (!isEmpty(this.props.allCustomerInvoices)) {
			this.props.setCustomerInvoices(
				this.props.allCustomerInvoices,
				this.props.allCustomerInvoices.length
			);
			// else if all customers is empty then we never filtered by customer do nothing
			// this will happen when they load all invoices, view customers invoices and then hit clear before using the filter
		} else {
			return;
		}
		// set page in parent to be 0
		this.props.resetPage();
		this.setState({ usingFilter: false });
		this.props.setUsingFilter(false);

		// reset the filter
		this.setState(DEFAULT_STATE, () =>
			this.setState({
				status: {
					partialRefund: false,
					paid: false,
					refunded: false,
					sent: false,
					canceled: false,
				},
			})
		);

		popupState.close();
	};

	checkFiltersSelected = () => {
		return this.state === DEFAULT_STATE;
	};

	// apply all filters and close filters window
	applyFilters = async (popupState) => {
		let filteredInvoices;
		popupState.close();

		// we are filtering by customer use filteredInvoices
		if (this.props.useCustomerFilter) {
			if (isEmpty(this.props.allCustomerInvoices)) {
				this.props.renderLoading(true, true);
				await this.props.fetchAllCustomerInvoices(
					this.props.stripeCustomerId
				);
				// we are fetching all render loading for all
			}

			filteredInvoices = this.props.allCustomerInvoices;
		} else {
			// Fetch all invoices,  (only fetch them all if we haven't already)
			if (isEmpty(this.props.allInvoices)) {
				this.props.renderLoading(true, true);
				await this.props.fetchAllInvoices();

				// we are fetching all render loading for all
			}

			// if there are no invoices they left the page during fetchAllInvoices so just return
			if (isEmpty(this.props.allInvoices)) {
				return;
			}

			filteredInvoices = this.props.allInvoices;
		}
		const {
			dateFilter,
			daysMonthsFilter,
			daysMonths,
			selectedDate,
			selectedDate2,
			amount,
			amount2,
			amountFilter,
			referenceNumber,
			description,
			status,
		} = this.state;

		// apply date filters
		if (daysMonths && dateFilter === 'isInTheLast') {
			filteredInvoices = filteredInvoices.filter((
				invoice // check if created date is in the last "date" days or months
			) =>
				moment
					.unix(invoice.created)
					.isAfter(moment().subtract(daysMonths, daysMonthsFilter))
			);
		} else if (dateFilter === 'equals') {
			filteredInvoices = filteredInvoices.filter((
				invoice // check if created date equals selected date
			) => moment.unix(invoice.created).isSame(selectedDate, 'day'));
		} else if (dateFilter === 'between') {
			filteredInvoices = filteredInvoices.filter(
				(
					invoice // check if created date is between two days
				) =>
					moment.unix(invoice.created).isAfter(selectedDate) &&
					moment.unix(invoice.created).isBefore(selectedDate2)
			);
		} else if (dateFilter === 'isBefore') {
			filteredInvoices = filteredInvoices.filter((
				invoice // check if created date is between two days
			) => moment.unix(invoice.created).isBefore(selectedDate));
		} else if (dateFilter === 'isAfter') {
			filteredInvoices = filteredInvoices.filter((
				invoice // check if created date is between two days
			) => moment.unix(invoice.created).isAfter(selectedDate));
		}

		// apply amount filters
		if (amount && amountFilter === 'equals') {
			filteredInvoices = filteredInvoices.filter(
				(invoice) => invoice.amount === amount * 100
			);
		} else if (amount && amountFilter === 'between') {
			filteredInvoices = filteredInvoices.filter(
				(invoice) =>
					invoice.amount > amount * 100 &&
					invoice.amount < amount2 * 100
			);
		} else if (amount && amountFilter === 'greaterThan') {
			filteredInvoices = filteredInvoices.filter(
				(invoice) => invoice.amount > amount * 100
			);
		} else if (amount && amountFilter === 'lessThan') {
			filteredInvoices = filteredInvoices.filter(
				(invoice) => invoice.amount < amount * 100
			);
		}

		// apply reference filter
		if (referenceNumber) {
			filteredInvoices = filteredInvoices.filter(
				(invoice) =>
					invoice.metadata.reference_number === referenceNumber
			);
		}

		// apply description filter
		if (description) {
			filteredInvoices = filteredInvoices.filter(
				(invoice) => invoice.description === description
			);
		}

		const statusFilters = Object.keys(status); // get [partialRefund, 'paid', 'refunded', 'sent', 'canceled']

		let appliedStatusFilters = statusFilters.filter((k) => status[k]); // get the filters that are set to true e.g. ['paid', 'sent']

		// apply status filters
		if (appliedStatusFilters.length > 0) {
			appliedStatusFilters = appliedStatusFilters.map((statusFilter) => {
				if (statusFilter === 'partialRefund') {
					return 'partial refund';
				}
				return statusFilter;
			});

			filteredInvoices = filteredInvoices.filter((invoice) => {
				// only return invoice if it has one of the applied status filters
				if (
					appliedStatusFilters.includes(
						invoice.statusFormatted.toLowerCase()
					)
				) {
					return invoice;
				}

				return null;
			});
		}

		// set the invoices to be the filtered ones

		if (this.props.useCustomerFilter) {
			this.props.setCustomerInvoices(
				filteredInvoices,
				filteredInvoices.length
			);
		} else {
			this.props.setInvoices(filteredInvoices, filteredInvoices.length);
		}

		this.setState({ usingFilter: true });
		this.props.setUsingFilter(true);

		this.props.renderLoading(true, false);
	};

	renderFilterCount = () => {
		const {
			amount,
			status,
			dateFilter,
			daysMonths,
			referenceNumber,
			description,
		} = this.state;

		// see if date filter is on
		const dateFilterOn =
			dateFilter !== DEFAULT_DATE_FILTER || daysMonths !== '';

		// see if amount filter is on
		const amountFilter = amount > 0 ? 1 : 0;

		// see if the reference filter is on
		const referenceFilter = referenceNumber !== DEFAULT_REFERENCE_NUMBER;

		// see if the description filter is on
		const descriptionFilter = description !== DEFAULT_DESCRIPTION;

		// see if status filter is on
		const statuses = Object.values(status);

		const statusFilter =
			statuses.filter((aStatus) => aStatus === true).length > 0 ? 1 : 0;

		// sum all filter counts
		const filterCount =
			dateFilterOn +
			amountFilter +
			statusFilter +
			referenceFilter +
			descriptionFilter;

		return (
			<span>
				{filterCount > 0 ? `Filter ${filterCount}` : `Filter  `}
			</span>
		);
	};

	handleChange = (event) => {
		this.setState({ [event.target.name]: event.target.value });
	};

	handleMenuChange = (value) => {
		const {
			openStatusMenu,
			openAmountMenu,
			openDateMenu,
			openReferenceNumberMenu,
			openDescriptionMenu,
		} = this.state;

		// close the menu if it's clicked on again
		if (value === 'status') {
			this.setState({ openStatusMenu: !openStatusMenu });
		} else if (value === 'referenceNumber') {
			this.setState({
				openReferenceNumberMenu: !openReferenceNumberMenu,
			});
		} else if (value === 'description') {
			this.setState({
				openDescriptionMenu: !openDescriptionMenu,
			});
		} else if (value === 'amount') {
			this.setState({ openAmountMenu: !openAmountMenu });
		} else if (value === 'date') {
			this.setState({ openDateMenu: !openDateMenu });
		}
	};

	handleDateChange = (date) => {
		this.setState({ selectedDate: date });
	};

	handleDateChange2 = (date) => {
		this.setState({ selectedDate2: date });
	};

	renderDateInputs = () => {
		const { daysMonths, dateFilter, daysMonthsFilter } = this.state;

		if (dateFilter === 'isInTheLast') {
			return (
				<Grid container style={{ marginTop: '5px' }}>
					<Grid item>
						<TextField
							placeholder="0"
							variant="outlined"
							style={{ width: '40px' }}
							inputProps={{
								style: {
									padding: '5px',
								},
							}}
							value={daysMonths}
							onChange={this.handleChange}
							name="daysMonths"
							autoFocus
						/>
					</Grid>
					<Grid item style={{ marginLeft: '10px' }}>
						<Select
							labelId="days-months-select"
							id="days-months-select"
							value={daysMonthsFilter}
							name="daysMonthsFilter"
							onChange={this.handleChange}
						>
							<MenuItem value="days">days</MenuItem>
							<MenuItem value="months">months</MenuItem>
						</Select>
					</Grid>
				</Grid>
			);
		}

		if (dateFilter === 'between') {
			return (
				<MuiPickersUtilsProvider utils={MomentUtils}>
					<Grid container alignItems="center">
						<Grid>
							<DatePicker
								disableToolbar
								variant="inline"
								format="MM/DD/yyyy"
								margin="normal"
								id="date-picker-inline"
								value={this.state.selectedDate}
								onChange={this.handleDateChange}
								name="selectedDate"
								style={{ width: '85px', marginTop: '2px' }}
							/>
						</Grid>
						<Grid
							alignContent="center"
							style={{
								height: '25px',
								marginLeft: '5px',
								marginRight: '5px',
							}}
						>
							and
						</Grid>
						<Grid>
							<DatePicker
								disableToolbar
								variant="inline"
								format="MM/DD/yyyy"
								margin="normal"
								id="date-picker-inline"
								value={this.state.selectedDate2}
								onChange={this.handleDateChange2}
								name="selectedDate2"
								style={{ width: '85px', marginTop: '2px' }}
							/>
						</Grid>
					</Grid>
				</MuiPickersUtilsProvider>
			);
		}

		return (
			<MuiPickersUtilsProvider utils={MomentUtils}>
				<DatePicker
					disableToolbar
					variant="inline"
					format="MM/DD/yyyy"
					margin="normal"
					id="date-picker-inline"
					value={this.state.selectedDate}
					onChange={this.handleDateChange}
					style={{ width: '90px', marginTop: '2px' }}
				/>
			</MuiPickersUtilsProvider>
		);
	};

	renderDateMenu = () => {
		const { openDateMenu, dateFilter } = this.state;

		return (
			<Collapse in={openDateMenu} timeout="auto" unmountOnExit>
				<div style={{ paddingLeft: '15px', paddingBottom: '0px' }}>
					<Select
						labelId="date-select"
						id="date-select"
						value={dateFilter}
						onChange={this.handleChange}
						name="dateFilter"
					>
						<MenuItem value="isInTheLast">is in the last</MenuItem>
						<MenuItem value="equals">is equal to</MenuItem>
						<MenuItem value="between">is between</MenuItem>
						<MenuItem value="isAfter">is after</MenuItem>
						<MenuItem value="isBefore">is before</MenuItem>
					</Select>
				</div>
				<Grid
					container
					direction="row"
					justify="flex-start"
					alignItems="center"
				>
					<Grid item style={{ paddingLeft: '15px' }}>
						<SubdirectoryArrowRightIcon color="primary" />
					</Grid>

					<Grid item>{this.renderDateInputs()}</Grid>
				</Grid>
			</Collapse>
		);
	};

	handleAmountFilterChange = (event) => {
		this.setState({ amountFilter: event.target.value });
	};

	handleAmountChange = (event) => {
		this.setState({ [event.target.name]: event.target.value });
	};

	renderAmountInputs = () => {
		const { amount, amount2, amountFilter } = this.state;

		// render two inputs
		if (amountFilter === 'between') {
			return (
				<Grid container>
					<Grid item>
						<TextField
							placeholder="0"
							variant="outlined"
							style={{ width: '40px' }}
							inputProps={{
								style: {
									padding: '5px',
								},
							}}
							onChange={this.handleAmountChange}
							value={amount}
							name="amount"
							autoFocus
						/>
					</Grid>
					<Grid
						item
						style={{
							paddingLeft: '5px',
							paddingRight: '5px',
							paddingTop: '5px',
						}}
					>
						and
					</Grid>
					<Grid item>
						<TextField
							placeholder="0"
							variant="outlined"
							style={{ width: '40px' }}
							inputProps={{
								style: {
									padding: '5px',
								},
							}}
							onChange={this.handleAmountChange}
							value={amount2}
							name="amount2"
						/>
					</Grid>
				</Grid>
			);
		}

		// render one input
		return (
			<TextField
				placeholder="0"
				variant="outlined"
				style={{ width: '40px' }}
				inputProps={{
					style: {
						padding: '5px',
					},
				}}
				onChange={this.handleAmountChange}
				value={amount}
				name="amount"
				autoFocus
			/>
		);
	};

	renderAmountMenu = () => {
		const { openAmountMenu, amountFilter } = this.state;

		return (
			<Collapse in={openAmountMenu} timeout="auto" unmountOnExit>
				<div style={{ paddingLeft: '15px', paddingBottom: '5px' }}>
					<Select
						labelId="amount-select"
						id="amount-select"
						value={amountFilter}
						onChange={this.handleAmountFilterChange}
					>
						<MenuItem value="equals">is equal to</MenuItem>
						<MenuItem value="between">is between</MenuItem>
						<MenuItem value="greaterThan">is greater than</MenuItem>
						<MenuItem value="lessThan">is less than</MenuItem>
					</Select>
				</div>
				<Grid
					container
					direction="row"
					justify="flex-start"
					alignItems="center"
				>
					<Grid item style={{ paddingLeft: '15px' }}>
						<SubdirectoryArrowRightIcon color="primary" />
					</Grid>

					<Grid item>{this.renderAmountInputs()}</Grid>
				</Grid>
			</Collapse>
		);
	};

	handleReferenceNumberChange = (event) => {
		this.setState({ [event.target.name]: event.target.value });
	};

	renderReferenceNumberInput = () => {
		const { referenceNumber } = this.state;

		return (
			<TextField
				placeholder=""
				variant="outlined"
				style={{ width: '120px' }}
				inputProps={{
					style: {
						padding: '5px',
					},
				}}
				onChange={this.handleReferenceNumberChange}
				value={referenceNumber}
				name="referenceNumber"
				autoFocus
			/>
		);
	};

	renderReferenceNumberMenu = () => {
		const { openReferenceNumberMenu } = this.state;

		return (
			<Collapse in={openReferenceNumberMenu} timeout="auto" unmountOnExit>
				<Grid
					container
					direction="row"
					justify="flex-start"
					alignItems="center"
				>
					<Grid item style={{ paddingLeft: '15px' }}>
						<SubdirectoryArrowRightIcon color="primary" />
					</Grid>
					<Grid item>{this.renderReferenceNumberInput()}</Grid>
				</Grid>
			</Collapse>
		);
	};

	handleDescriptionChange = (event) => {
		this.setState({ [event.target.name]: event.target.value });
	};

	renderDescriptionInput = () => {
		const { description } = this.state;

		return (
			<TextField
				placeholder=""
				variant="outlined"
				style={{ width: '120px' }}
				inputProps={{
					style: {
						padding: '5px',
					},
				}}
				onChange={this.handleDescriptionChange}
				value={description}
				name="description"
				autoFocus
			/>
		);
	};

	renderDescriptionMenu = () => {
		const { openDescriptionMenu } = this.state;

		return (
			<Collapse in={openDescriptionMenu} timeout="auto" unmountOnExit>
				<Grid
					container
					direction="row"
					justify="flex-start"
					alignItems="center"
				>
					<Grid item style={{ paddingLeft: '15px' }}>
						<SubdirectoryArrowRightIcon color="primary" />
					</Grid>
					<Grid item>{this.renderDescriptionInput()}</Grid>
				</Grid>
			</Collapse>
		);
	};

	handleStatusChange = (key) => {
		const { status } = this.state;

		// toggle status
		status[key] = !status[key];

		this.setState({ status });
	};

	renderStatusMenu = () => {
		const { status, openStatusMenu } = this.state;

		return (
			<Collapse in={openStatusMenu} timeout="auto" unmountOnExit>
				<MenuItem onClick={() => this.handleStatusChange('paid')}>
					<Checkbox
						checked={status.paid}
						disableRipple
						style={checkboxStyle}
						inputProps={{
							'aria-label': 'primary checkbox',
						}}
					/>{' '}
					Paid
				</MenuItem>
				<MenuItem
					onClick={() => this.handleStatusChange('partialRefund')}
				>
					<Checkbox
						checked={status.partialRefund}
						disableRipple
						style={checkboxStyle}
						inputProps={{
							'aria-label': 'primary checkbox',
						}}
					/>{' '}
					Partial Refund
				</MenuItem>
				<MenuItem
					onClick={() => {
						this.handleStatusChange('refunded');
					}}
				>
					<Checkbox
						checked={status.refunded}
						style={checkboxStyle}
						disableRipple
						inputProps={{
							'aria-label': 'primary checkbox',
						}}
					/>{' '}
					Refunded
				</MenuItem>
				<MenuItem
					onClick={() => {
						this.handleStatusChange('sent');
					}}
				>
					<Checkbox
						checked={status.sent}
						style={checkboxStyle}
						disableRipple
						inputProps={{
							'aria-label': 'primary checkbox',
						}}
					/>{' '}
					Sent
				</MenuItem>
				<MenuItem
					onClick={() => {
						this.handleStatusChange('canceled');
					}}
				>
					<Checkbox
						checked={status.canceled}
						style={checkboxStyle}
						disableRipple
						inputProps={{
							'aria-label': 'primary checkbox',
						}}
					/>{' '}
					Canceled
				</MenuItem>
			</Collapse>
		);
	};

	renderActionButtons = (popupState) => (
		<Grid
			container
			direction="row"
			justify="space-between"
			alignItems="center"
			style={{
				backgroundColor: '#F0F0F0',
				width: '250px',
				padding: 6,
			}}
		>
			<Grid item>
				<Button
					variant="contained"
					size="small"
					onClick={() => this.clearAllFilters(popupState)}
				>
					Clear
				</Button>
			</Grid>
			<Grid item>
				<strong>Filters</strong>
			</Grid>
			<Grid item>
				<Button
					variant="contained"
					size="small"
					color="primary"
					onClick={() => this.applyFilters(popupState)}
					disabled={this.checkFiltersSelected()}
				>
					Done
				</Button>
			</Grid>
		</Grid>
	);

	renderMenu = (popupState) => {
		const {
			openDateMenu,
			openAmountMenu,
			openStatusMenu,
			openReferenceNumberMenu,
			openDescriptionMenu,
		} = this.state;

		return (
			<Menu
				{...bindMenu(popupState)}
				style={{ marginTop: '45px' }}
				MenuListProps={{ style: { paddingTop: 0 } }}
				// autoFocus={false}
				// disableAutoFocusItem={true}
				// variant="menu"
			>
				{this.renderActionButtons(popupState)}
				<MenuItem
					autoFocus
					onClick={() => this.handleMenuChange('date')}
				>
					{/* invisible character in front of date */}
					{'‎‎Date'} {openDateMenu ? <ExpandLess /> : <ExpandMore />}
				</MenuItem>
				{this.renderDateMenu()}
				<MenuItem onClick={() => this.handleMenuChange('amount')}>
					{/* invisible character in front of date */}
					{'‎Amount'}{' '}
					{openAmountMenu ? <ExpandLess /> : <ExpandMore />}
				</MenuItem>
				{this.renderAmountMenu()}
				<MenuItem
					onClick={() => this.handleMenuChange('referenceNumber')}
				>
					{/* invisible character in front of date */}
					{'‎Reference Number'}
					{openReferenceNumberMenu ? <ExpandLess /> : <ExpandMore />}
				</MenuItem>
				{this.renderReferenceNumberMenu()}
				<MenuItem onClick={() => this.handleMenuChange('description')}>
					{/* invisible character in front of date */}
					{'‎Description'}
					{openDescriptionMenu ? <ExpandLess /> : <ExpandMore />}
				</MenuItem>
				{this.renderDescriptionMenu()}
				<MenuItem onClick={() => this.handleMenuChange('status')}>
					{/* invisible character in front of date */}
					{'‎Status'}
					{openStatusMenu ? <ExpandLess /> : <ExpandMore />}
				</MenuItem>
				{this.renderStatusMenu()}
			</Menu>
		);
	};

	renderFilterDropdownMenu = () => (
		<div style={{ margin: 8 }}>
			<PopupState variant="popover" popupId="demo-popup-popover">
				{(popupState) => (
					<React.Fragment>
						<Button
							color="primary"
							variant="text"
							{...bindTrigger(popupState)}
							disabled={
								isEmpty(this.props.filteredInvoices) &&
								isEmpty(this.props.customerInvoices) &&
								!this.state.usingFilter
							}
						>
							<FilterListIcon />

							{this.renderFilterCount()}
						</Button>

						<div>{this.renderMenu(popupState)}</div>
					</React.Fragment>
				)}
			</PopupState>
		</div>
	);

	render() {
		return this.renderFilterDropdownMenu();
	}
}

const mapStateToProps = (state) => ({
	filteredInvoices: state.payments.filteredInvoices,
	allInvoices: state.payments.allInvoices,
	customerInvoices: state.payments.customerInvoices,
	allCustomerInvoices: state.payments.allCustomerInvoices,
});

export default connect(mapStateToProps, {
	fetchAllInvoices,
	setInvoices,
	fetchAllCustomerInvoices,
	setCustomerInvoices,
})(InvoiceFilterMenu);
