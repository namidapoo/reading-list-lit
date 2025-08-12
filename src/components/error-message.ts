import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

type ErrorType = "error" | "warning" | "info";

@customElement("error-message")
export class ErrorMessage extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}

		.error-container {
			display: flex;
			align-items: flex-start;
			gap: 12px;
			padding: 12px 16px;
			border-radius: 8px;
			animation: slideDown var(--transition-base, 250ms ease);
			position: relative;
		}

		.error-container.error {
			background-color: #fef2f2;
			border: 1px solid #fecaca;
			color: #dc2626;
		}

		.error-container.warning {
			background-color: #fffbeb;
			border: 1px solid #fde68a;
			color: #d97706;
		}

		.error-container.info {
			background-color: #eff6ff;
			border: 1px solid #bfdbfe;
			color: #2563eb;
		}

		.error-container.hiding {
			animation: slideUp var(--transition-base, 250ms ease) forwards;
		}

		@keyframes slideDown {
			from {
				opacity: 0;
				transform: translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		@keyframes slideUp {
			from {
				opacity: 1;
				transform: translateY(0);
			}
			to {
				opacity: 0;
				transform: translateY(-10px);
			}
		}

		.icon {
			flex-shrink: 0;
			width: 20px;
			height: 20px;
		}

		.content {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.message {
			font-size: 14px;
			font-weight: 500;
			line-height: 1.5;
		}

		.description {
			font-size: 13px;
			opacity: 0.9;
			line-height: 1.4;
		}

		.actions {
			display: flex;
			gap: 8px;
			margin-top: 8px;
		}

		.retry-button {
			padding: 4px 12px;
			border-radius: 4px;
			border: 1px solid currentColor;
			background: transparent;
			color: inherit;
			font-size: 13px;
			cursor: pointer;
			transition: all var(--transition-fast, 150ms ease);
		}

		.retry-button:hover {
			background-color: rgba(0, 0, 0, 0.05);
		}

		.close-button {
			position: absolute;
			top: 12px;
			right: 12px;
			width: 20px;
			height: 20px;
			border: none;
			background: transparent;
			color: inherit;
			cursor: pointer;
			opacity: 0.6;
			transition: opacity var(--transition-fast, 150ms ease);
			padding: 0;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.close-button:hover {
			opacity: 1;
		}
	`;

	@property({ type: String })
	message = "";

	@property({ type: String })
	type: ErrorType = "error";

	@property({ type: Boolean })
	autoHide = false;

	@property({ type: Number })
	autoHideDelay = 3000;

	@property({ type: Boolean })
	showCloseButton = true;

	@property({ type: Boolean })
	showRetryButton = false;

	@state()
	private hiding = false;

	private autoHideTimer?: number;

	override updated(changedProperties: Map<string, unknown>) {
		super.updated(changedProperties);

		if (changedProperties.has("message")) {
			if (this.message) {
				this.handleNewMessage();
			} else {
				this.clearError();
			}
		}
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		if (this.autoHideTimer) {
			clearTimeout(this.autoHideTimer);
		}
	}

	private handleNewMessage() {
		this.hiding = false;
		this.dispatchEvent(new CustomEvent("error-shown"));

		if (this.autoHide) {
			if (this.autoHideTimer) {
				clearTimeout(this.autoHideTimer);
			}
			this.autoHideTimer = window.setTimeout(() => {
				this.hiding = true;
				setTimeout(() => this.clearError(), 250);
			}, this.autoHideDelay);
		}
	}

	private clearError() {
		this.message = "";
		this.hiding = false;
		if (this.autoHideTimer) {
			clearTimeout(this.autoHideTimer);
		}
		this.dispatchEvent(new CustomEvent("error-cleared"));
	}

	private handleClose() {
		this.clearError();
	}

	private handleRetry() {
		this.dispatchEvent(new CustomEvent("retry"));
		this.clearError();
	}

	private getIcon() {
		switch (this.type) {
			case "error":
				return html`
					<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				`;
			case "warning":
				return html`
					<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				`;
			case "info":
				return html`
					<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				`;
		}
	}

	private getDescription() {
		if (this.message.includes("Storage limit reached")) {
			return "The maximum limit of 512 items has been reached. Please remove some items to add new ones.";
		}
		if (this.message.includes("Network error")) {
			return "Unable to connect to the server. Please check your internet connection and try again.";
		}
		if (this.message.includes("Invalid URL")) {
			return "The URL format is not valid. Please check and try again.";
		}
		return "";
	}

	override render() {
		if (!this.message) {
			return html``;
		}

		const description = this.getDescription();

		return html`
			<div class="error-container ${this.type} ${this.hiding ? "hiding" : ""}">
				${this.getIcon()}
				<div class="content">
					<div class="message">${this.message}</div>
					${description ? html`<div class="description">${description}</div>` : ""}
					${
						this.showRetryButton
							? html`
							<div class="actions">
								<button class="retry-button" @click=${this.handleRetry}>
									Retry
								</button>
							</div>
						`
							: ""
					}
				</div>
				${
					this.showCloseButton
						? html`
						<button
							class="close-button"
							@click=${this.handleClose}
							aria-label="Close"
						>
							<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					`
						: ""
				}
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"error-message": ErrorMessage;
	}
}
