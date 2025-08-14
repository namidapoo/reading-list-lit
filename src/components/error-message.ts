import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { octagonAlertIcon, xIcon } from "./icons";

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
			align-items: center;
			gap: 0;
			padding: 0;
			border-radius: 0;
			animation: slideDown 0.25s ease-out;
			position: relative;
		}

		.error-container.error {
			background: #fee;
			border: 1px solid #fcc;
			color: #c00;
		}

		.error-container.warning {
			background: #ffeaa7;
			border: 1px solid #fdcb6e;
			color: #6c5ce7;
		}

		.error-container.info {
			background: #e3f2fd;
			border: 1px solid #90caf9;
			color: #1565c0;
		}

		.error-container.hiding {
			animation: slideUp 0.25s ease-out forwards;
			opacity: 0;
		}

		@keyframes slideDown {
			from {
				transform: translateY(-10px);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}

		@keyframes slideUp {
			from {
				transform: translateY(0);
				opacity: 1;
			}
			to {
				transform: translateY(-10px);
				opacity: 0;
			}
		}

		.icon {
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.icon svg {
			width: 20px;
			height: 20px;
		}

		.content {
			flex: 1;
			min-width: 0;
		}

		.message {
			font-weight: 500;
			font-size: 0.9rem;
			line-height: 1;
		}

		.description {
			margin-top: 0;
			font-size: 0.85rem;
			opacity: 0.8;
			line-height: 1;
		}

		.actions {
			margin-top: 0;
		}

		.retry-button {
			padding: 0;
			background: white;
			border: 1px solid currentColor;
			border-radius: 0;
			font-size: 0.85rem;
			cursor: pointer;
			color: inherit;
			font-weight: 500;
			transition: all 0.2s ease;
		}

		.retry-button:hover {
			transform: translateY(-1px);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}

		.retry-button:active {
			transform: translateY(0);
		}

		.close-button {
			position: relative;
			margin-left: auto;
			width: 24px;
			height: 24px;
			border: none;
			background: transparent;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: inherit;
			opacity: 0.6;
			padding: 0;
			border-radius: 0;
			transition: all 0.2s ease;
		}

		.close-button:hover {
			opacity: 1;
			background: rgba(0, 0, 0, 0.1);
		}

		.close-button:focus-visible {
			outline: 3px solid lightblue;
		}

		.close-button span {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
		}

		.close-button span svg {
			width: 14px;
			height: 14px;
		}

		@media (prefers-color-scheme: dark) {
			.error-container.error {
				background: #4a1c1c;
				border-color: #8b2c2c;
				color: #ff9999;
			}

			.error-container.warning {
				background: #4a3c1c;
				border-color: #8b6c2c;
				color: #ffcc66;
			}

			.error-container.info {
				background: #1c2c4a;
				border-color: #2c4c8b;
				color: #99ccff;
			}

			.retry-button {
				background: rgba(255, 255, 255, 0.1);
			}

			.close-button:hover {
				background: rgba(255, 255, 255, 0.1);
			}
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
		// すべてのタイプで同じoctagon-alertアイコンを使用
		return html`<span class="icon">${octagonAlertIcon()}</span>`;
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
							${xIcon()}
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
