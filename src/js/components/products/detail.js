// @flow

import * as React from 'react';
import DocumentTitle from 'react-document-title';
import i18n from 'i18next';
import { Link, Redirect } from 'react-router-dom';
import { Trans } from 'react-i18next';
import { connect } from 'react-redux';

import routes from 'utils/routes';
import {
  fetchAdditionalPlans,
  fetchPlan,
  fetchProduct,
  fetchVersion,
} from 'store/products/actions';
import {
  selectProduct,
  selectProductSlug,
  selectVersion,
  selectVersionLabelOrPlanSlug,
} from 'store/products/selectors';
import { selectUserState } from 'store/user/selectors';
import { getLoadingOrNotFound, shouldFetchVersion } from 'components/utils';
import BackLink from 'components/backLink';
import BodyContainer from 'components/bodyContainer';
import Header from 'components/header';
import OldVersionWarning from 'components/products/oldVersionWarning';
import PageHeader from 'components/products/header';
import ProductNotAllowed from 'components/products/notAllowed';
import ProductNotFound from 'components/products/product404';
import VersionNotFound from 'components/products/version404';
import type { AppState } from 'store';
import type { InitialProps } from 'components/utils';
import type {
  Product as ProductType,
  Version as VersionType,
} from 'store/products/reducer';
import type { User as UserType } from 'store/user/reducer';
import type { VersionPlanType } from 'store/products/selectors';
import type { Plan as PlanType } from 'store/plans/reducer';

type ProductDetailProps = {
  product: ProductType | null | void,
  productSlug: ?string,
  doFetchProduct: typeof fetchProduct,
};
type VersionDetailProps = {
  ...InitialProps,
  user: UserType,
  product: ProductType | null | void,
  productSlug: ?string,
  version: VersionType | null,
  versionLabelAndPlanSlug: VersionPlanType,
  doFetchProduct: typeof fetchProduct,
  doFetchVersion: typeof fetchVersion,
  doFetchAdditionalPlans: typeof fetchAdditionalPlans,
  doFetchPlan: typeof fetchPlan,
};

class ProductDetail extends React.Component<ProductDetailProps> {
  fetchProductIfMissing() {
    const { product, productSlug, doFetchProduct } = this.props;
    if (product === undefined && productSlug) {
      // Fetch product from API
      doFetchProduct({ slug: productSlug });
    }
  }

  componentDidMount() {
    this.fetchProductIfMissing();
  }

  componentDidUpdate(prevProps) {
    const { product, productSlug } = this.props;
    const productChanged =
      product !== prevProps.product || productSlug !== prevProps.productSlug;
    if (productChanged) {
      this.fetchProductIfMissing();
    }
  }

  render(): React.Node {
    const { product, productSlug } = this.props;
    const loadingOrNotFound = getLoadingOrNotFound({
      product,
      productSlug,
      route: 'product_detail',
    });
    if (loadingOrNotFound !== false) {
      return loadingOrNotFound;
    }
    // This redundant check is required to satisfy Flow:
    // https://flow.org/en/docs/lang/refinements/#toc-refinement-invalidations
    /* istanbul ignore if */
    if (!product) {
      return <ProductNotFound />;
    }
    if (!product.most_recent_version) {
      return <VersionNotFound product={product} />;
    }
    const version = product.most_recent_version;
    return <Redirect to={routes.version_detail(product.slug, version.label)} />;
  }
}

const BodySection = ({ children }: { children: ?React.Node }) => (
  <div
    className="slds-text-longform
      slds-p-around_medium
      slds-size_1-of-1
      slds-medium-size_1-of-2"
  >
    {children}
  </div>
);

class VersionDetail extends React.Component<VersionDetailProps> {
  fetchProductIfMissing() {
    const { product, productSlug, doFetchProduct } = this.props;
    if (product === undefined && productSlug) {
      // Fetch product from API
      doFetchProduct({ slug: productSlug });
    }
  }

  fetchVersionIfMissing() {
    const {
      product,
      version,
      versionLabelAndPlanSlug,
      doFetchVersion,
    } = this.props;
    const { label, slug } = versionLabelAndPlanSlug;
    // If we have a plan slug, do not try to fetch version
    // (redirect to plan-detail instead)
    if (
      product &&
      label &&
      !slug &&
      shouldFetchVersion({ product, version, versionLabel: label })
    ) {
      // Fetch version from API
      doFetchVersion({ product: product.id, label });
    }
  }

  fetchAdditionalPlansIfMissing() {
    const { product, version, doFetchAdditionalPlans } = this.props;
    if (product && version && !version.fetched_additional_plans) {
      // Fetch plans from API
      doFetchAdditionalPlans({ product: product.id, version: version.id });
    }
  }

  fetchPlanIfMissing() {
    const { product, versionLabelAndPlanSlug, doFetchPlan } = this.props;
    const { maybeVersion, maybeSlug } = versionLabelAndPlanSlug;
    if (product && maybeVersion && maybeSlug) {
      // Fetch plan from API
      doFetchPlan({
        product: product.id,
        version: maybeVersion,
        slug: maybeSlug,
      });
    }
  }

  componentDidMount() {
    this.fetchProductIfMissing();
    this.fetchVersionIfMissing();
    this.fetchAdditionalPlansIfMissing();
    this.fetchPlanIfMissing();
  }

  componentDidUpdate(prevProps) {
    const {
      product,
      productSlug,
      version,
      versionLabelAndPlanSlug,
    } = this.props;
    const { label, slug, maybeVersion, maybeSlug } = versionLabelAndPlanSlug;
    const productChanged =
      product !== prevProps.product || productSlug !== prevProps.productSlug;
    const versionChanged =
      productChanged ||
      version !== prevProps.version ||
      label !== prevProps.versionLabelAndPlanSlug.label ||
      slug !== prevProps.versionLabelAndPlanSlug.slug ||
      maybeVersion !== prevProps.versionLabelAndPlanSlug.maybeVersion ||
      maybeSlug !== prevProps.versionLabelAndPlanSlug.maybeSlug;
    if (productChanged) {
      this.fetchProductIfMissing();
    }
    if (versionChanged) {
      this.fetchVersionIfMissing();
      this.fetchAdditionalPlansIfMissing();
      this.fetchPlanIfMissing();
    }
  }

  render(): React.Node {
    const {
      user,
      product,
      productSlug,
      version,
      versionLabelAndPlanSlug,
      history,
    } = this.props;
    const { label, slug, maybeVersion, maybeSlug } = versionLabelAndPlanSlug;
    const loadingOrNotFound = getLoadingOrNotFound({
      product,
      productSlug,
      version,
      versionLabel: label,
      planSlug: slug,
      route: 'version_detail',
      maybeVersion,
      maybeSlug,
    });
    if (loadingOrNotFound !== false) {
      return loadingOrNotFound;
    }
    // this redundant check is required to satisfy Flow:
    // https://flow.org/en/docs/lang/refinements/#toc-refinement-invalidations
    /* istanbul ignore if */
    if (!product || !version) {
      return <ProductNotFound />;
    }

    const listedAdditionalPlans: Array<PlanType> = version.additional_plans
      ? (Object.entries(version.additional_plans): any)
          .filter(
            ([key, plan]: [string, PlanType | null]) =>
              plan && plan.is_listed && plan.is_allowed && key === plan.slug,
          )
          .map((item: Array<[string, PlanType]>) => item[1])
      : [];
    const { primary_plan, secondary_plan } = version;
    const visiblePrimaryPlan =
      primary_plan && primary_plan.is_listed && primary_plan.is_allowed;
    const visibleSecondaryPlan =
      secondary_plan && secondary_plan.is_listed && secondary_plan.is_allowed;
    const productDescriptionHasTitle =
      (product.description && product.description.startsWith('<h1>')) ||
      (product.description && product.description.startsWith('<h2>'));
    const isMostRecent =
      product.most_recent_version &&
      new Date(version.created_at) >=
        new Date(product.most_recent_version.created_at);

    return (
      <DocumentTitle title={`${product.title} | ${window.SITE_NAME}`}>
        <>
          <Header history={history} />
          <PageHeader product={product} versionLabel={version.label} />
          {product.is_allowed ? (
            <BodyContainer>
              {product.most_recent_version && !isMostRecent ? (
                <OldVersionWarning
                  link={routes.version_detail(
                    product.slug,
                    product.most_recent_version.label,
                  )}
                />
              ) : null}
              <BodySection>
                <p>{version.description}</p>
                {primary_plan && visiblePrimaryPlan ? (
                  <p>
                    <Link
                      to={routes.plan_detail(
                        product.slug,
                        version.label,
                        primary_plan.slug,
                      )}
                      className="slds-button
                        slds-button_brand
                        slds-size_full"
                    >
                      {primary_plan.title} - {i18n.t('View Details')}
                    </Link>
                  </p>
                ) : null}
                {secondary_plan && visibleSecondaryPlan ? (
                  <p>
                    <Link
                      to={routes.plan_detail(
                        product.slug,
                        version.label,
                        secondary_plan.slug,
                      )}
                      className="slds-button
                        slds-button_outline-brand
                        slds-size_full"
                    >
                      {secondary_plan.title} - {i18n.t('View Details')}
                    </Link>
                  </p>
                ) : null}
                <BackLink
                  label={i18n.t('Select a different product')}
                  url={routes.product_list()}
                />
                {listedAdditionalPlans.length ? (
                  <div className="slds-p-top_x-large">
                    {visiblePrimaryPlan || visibleSecondaryPlan ? (
                      <h2 className="slds-text-heading_small">
                        {i18n.t('Additional Plans')}
                      </h2>
                    ) : null}
                    {listedAdditionalPlans.map((plan) => (
                      <p key={plan.id}>
                        <Link
                          to={routes.plan_detail(
                            product.slug,
                            version.label,
                            plan.slug,
                          )}
                        >
                          {plan.title}
                        </Link>
                      </p>
                    ))}
                  </div>
                ) : null}
              </BodySection>
              <BodySection>
                {!productDescriptionHasTitle && (
                  <h2 className="slds-text-heading_small">
                    {i18n.t('About')} {product.title}
                  </h2>
                )}
                {product.image ? (
                  <img
                    className="slds-size_full"
                    src={product.image}
                    alt={product.title}
                  />
                ) : null}
                {/* This description is pre-cleaned by the API */}
                <div
                  className="markdown"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </BodySection>
            </BodyContainer>
          ) : (
            <ProductNotAllowed
              isLoggedIn={user !== null}
              message={product.not_allowed_instructions}
              link={
                <Trans i18nKey="productNotAllowed">
                  Try the{' '}
                  <Link to={routes.product_list()}>list of all products</Link>
                </Trans>
              }
            />
          )}
        </>
      </DocumentTitle>
    );
  }
}

const selectProductDetail = (appState: AppState, props: InitialProps) => ({
  product: selectProduct(appState, props),
  productSlug: selectProductSlug(appState, props),
});

const selectVersionDetail = (appState: AppState, props: InitialProps) => ({
  user: selectUserState(appState),
  product: selectProduct(appState, props),
  productSlug: selectProductSlug(appState, props),
  version: selectVersion(appState, props),
  versionLabelAndPlanSlug: selectVersionLabelOrPlanSlug(appState, props),
});

const productActions = {
  doFetchProduct: fetchProduct,
};

const versionActions = {
  doFetchProduct: fetchProduct,
  doFetchVersion: fetchVersion,
  doFetchAdditionalPlans: fetchAdditionalPlans,
  doFetchPlan: fetchPlan,
};

const WrappedProductDetail: React.ComponentType<InitialProps> = connect(
  selectProductDetail,
  productActions,
)(ProductDetail);
const WrappedVersionDetail: React.ComponentType<InitialProps> = connect(
  selectVersionDetail,
  versionActions,
)(VersionDetail);

export {
  WrappedProductDetail as ProductDetail,
  WrappedVersionDetail as VersionDetail,
};
