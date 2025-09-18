# Credit Bureaus Research Findings

## The Three Major Credit Bureaus

### Overview
The three major credit reporting agencies (CRAs) in the United States are:
1. **Experian**
2. **Equifax** 
3. **TransUnion**

These agencies collect and organize consumer credit data to create credit reports that are used by lenders, employers, and other authorized entities to make decisions about creditworthiness.

### Key Findings from Initial Research

#### Credit Bureau APIs and Data Access
- **MeridianLink CreditAPI**: Streamlines access to credit and verification services by connecting to all three major bureaus through a single, unified API
- **Equifax Consumer Engagement Suite**: Provides APIs for financial institutions to deliver consumers direct access to their credit scores and reports within their own portals
- **Bloom Data Access API**: Available on AWS Marketplace as a SaaS platform for connecting to US credit bureaus and performing both soft and hard inquiries

#### Data Formats and Standards
- **Metro 2 Format**: Standardized electronic format used by most furnishers to provide consumer credit information to credit reporting agencies
- Credit reports include:
  - Borrower information
  - Public records
  - Inquiries
  - Credit account information
  - Credit scores

#### Security and Compliance Considerations
- Credit data handling requires strict security measures
- APIs must support both soft and hard credit inquiries
- Data access is regulated and requires proper authorization
- Consumer consent and notification requirements apply

## Next Research Areas
1. Detailed API documentation and integration requirements
2. Security and encryption standards for credit data
3. Legal compliance requirements (FCRA, CROA, state laws)
4. Data privacy regulations and consumer rights
5. Authentication and authorization frameworks



## Experian API Details

### Consumer Credit Profile API
- **API Version**: OAS 3.1.0 v2.0.84
- **Base URL**: https://sandbox-us-api.experian.com/consumerservices/credit-profile
- **Documentation**: Available as OpenAPI/Swagger specification

### Available Endpoints:
1. **POST /v2/credit-report** - Standard Credit Report
2. **POST /v1/employment-insight** - Employment Insight Credit Check
3. **POST /v1/healthcare-credit-profile** - Healthcare Credit Profile
4. **POST /v1/automotive-credit** - Automotive Credit Profile
5. **POST /v1/tec-connect-credit** - TEC Connect Credit Profile
6. **POST /v1/connect-check** - Connect Check Credit Profile

### Credit Report Types Available:
- **Credit Profile**: Most comprehensive credit decision making tool
- **Automotive Credit Profile**: Specialized for automotive lenders and dealers
- **Employment Insight**: Modified version for employment verification
- **Health Care Credit Profile**: Designed specifically for healthcare industry
- **TEC Connect**: For telecommunications, energy, and cable industries
- **Connect Check**: Custom verification for utility/telecom/cable fraud detection
- **Extended View**: For consumers with thin credit history

### Add-on Services:
- **Direct Check**: Subscriber name, address, and telephone number
- **Demographics**: Best telephone numbers and geo codes
- **Scores**: Multiple predictive scores available
- **Score Percentile**: Consumer ranking among all US consumers
- **Profile Summary**: Debt, monthly obligations, and payment history snapshot
- **Fraud Shield**: Predictive fraud indicators
- **Military Lending Act (MLA)**: Military status indicator
- **OFAC**: Foreign nationals identification
- **Clear Early Risk Score (CERS)**: Early delinquency prediction
- **Synthetic Fraud Risk Level Indicator**: Synthetic identity detection
- **Tax Refund Loan Inquiry Indicator**: Fraudulent activity identification

### Security and Authentication:
- Requires API authorization
- Sandbox environment available for testing
- Production environment requires proper credentials and IP whitelisting


## Equifax API Details

### OneView (Consumer Credit Report) API
- **Description**: Industry leading cloud-based solution providing comprehensive consumer view
- **Data Sources**: EFX Credit File (ACRO) plus alternative data assets via single access
- **Alternative Data**: Income and Employment data, specialty finance DataX report, Utility and Telecom data

### Key Features:
- **Holistic Consumer View**: Single delivery from multiple sources
- **Configuration Engine**: Customizable print image version of reports
- **Upgraded Consumer Credit File**: Enhanced credit reporting capabilities
- **Alternative Data Integration**: Unique Income and Employment data, DataX reports, Utility/Telecom data

### Benefits:
- **Increase Revenue**: Streamlined acquisition processes and targeted cross-sell/up-sell campaigns
- **Fraud and Risk Reduction**: Quick identification of high-risk consumers
- **Account Management**: Comprehensive, accurate, up-to-date information including alternative data

### Use Cases:
- Credit worthiness determination for lending decisions
- Employment verifications
- Insurability assessments
- Utility and telecommunications account acquisitions
- Cross-sell/up-sell opportunities

### Target Industries:
- **Lenders**: Financial Institutions, Banks, Credit Unions, FinTechs, Personal Lending, Rental, Auto
- **Auto Dealers**
- **Insurers**
- **Government**
- **Utilities**
- **Communications**

### Technical Access:
- API Reference documentation requires developer account registration
- Additional API documentation available
- Support resources provided


## TransUnion API Details

### API Access Model:
- **Direct API**: TransUnion does not have a direct API
- **Batch Processing**: Provides batch processing through XML feeds
- **Integration Partners**: Works through software integration partners like iSoftpull

### Integration Partner Services (iSoftpull):
- **API Solutions**: Easy-to-implement credit API solutions
- **Credit Report Access**: Full TransUnion credit reports and credit score-based decisions
- **Soft and Hard Pulls**: Access to both soft and hard credit checks
- **FICO® and Vantage Scores**: All scoring models and versions available
- **Industry Tailored**: Scores tailored to specific industries

### Available API Products:
1. **Intelligence Indicator API**: Automated decision-making
2. **Report & Score View API**: Full report and score access
3. **Full Feed API**: Complete JSON feed for live credit data management

### Additional Services:
- **Credit Intelligence**: Proprietary technology for prequalification decisions
- **Identity Risk Suite**: Fraud management and synthetic identity fraud prevention
- **Income Analysis Suite**: Income prediction using credit, public, and tax data

### Technical Documentation Includes:
- **Code Definitions**: TU4.0 and TU4.1 record processing codes (Address, Name, Industry, Permissible Purpose, Remarks)
- **General Announcements**: Technical information and compliance requirements
- **Online Batch Instructions**: Templates for successful OLB transactions
- **Risk-Based Pricing Rules**: Credit score disclosure solutions
- **Score Distribution**: Graphs and interval tables for disclosure notices
- **Score Models**: Reason codes and master reason code tables
- **Security Freeze**: Instructions and test procedures
- **Test Subjects**: Fictitious subjects for testing services
- **Service Descriptions**: Comprehensive listing with service codes
- **TransUnion Net Access (TUNA)**: Video and written guides

### Target Industries:
- Mortgage
- Home Improvement
- Auto
- Health and Dental
- Business Loans
- Personal Loans
- Online Lenders

