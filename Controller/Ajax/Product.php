<?php

namespace AHT\FastOrder\Controller\Ajax;

use Dotdigitalgroup\Email\Block\Recommended\Push;
use Magento\Catalog\Helper\Image;
use Magento\Store\Model\StoreManager;

class Product extends \Magento\Framework\App\Action\Action
{
    protected $imageHelper;
    protected $listProduct;
    protected $_storeManager;
    protected $resultPageFactory;
    protected $jsonHelper;

    /**
     * @var \Magento\Catalog\Model\ResourceModel\Product\CollectionFactory
     */
    private $_productCollectionFactory;

    /**
     * @var \Magento\Catalog\Model\ProductRepository
     */
    private $_productRepository;

    /**
     * @var \Magento\ConfigurableProduct\Model\Product\Type\Configurable
     */
    private $_productConfigurable;

    public function __construct(
        \Magento\Framework\App\Action\Context $context,
        \Magento\Framework\Data\Form\FormKey $formKey,
        StoreManager $storeManager,
        Image $imageHelper,
        \Magento\Catalog\Model\ResourceModel\Product\CollectionFactory $productCollectionFactory,
        \Magento\Catalog\Model\ProductRepository $productRepository,
        \Magento\Framework\Json\Helper\Data $jsonHelper,
        \Psr\Log\LoggerInterface $logger,
        \Magento\ConfigurableProduct\Model\Product\Type\Configurable $productConfigurable
    ) {
        $this->imageHelper = $imageHelper;
        $this->_productCollectionFactory = $productCollectionFactory;
        $this->_productRepository = $productRepository;
        $this->_storeManager = $storeManager;
        $this->jsonHelper = $jsonHelper;
        $this->logger = $logger;
        $this->_productConfigurable = $productConfigurable;
        parent::__construct($context);
    }

    /**
     * Get recently placed product. By name or sku.
     */
    public function execute()
    {
        $productData = [];
        if ($name = $this->getRequest()->getParam('key')) {

            $productCollections = $this->_productCollectionFactory->create()
                ->addAttributeToSelect('*')
                ->addAttributeToFilter(
                    'name',
                    ['like' => '%' . $name . '%']
                )->addAttributeToFilter(
                    'type_id',
                    ['neq' => 'configurable']
                )
                ->setOrder(
                    'created_at',
                    'desc'
                )->setPageSize(
                    5
                );

            foreach ($productCollections as $productCollection) {
                $productId = intval($productCollection->getId());
                $product = $this->_productRepository->getById($productId);

                $parentArray = $this->_productConfigurable->getParentIdsByChild($product->getId());
                $parentId = reset($parentArray);
                $superAttibute = $this->getSuperAttributeData($parentId);
                $attributes = [];
                $labelAttributes = [];

                foreach ($superAttibute as $key => $value) {
                    $val = $product->getData($value);
                    $labelVal = $product->getResource()->getAttribute($value)->getFrontend()->getValue($product);

                    $attributes[$key] = $val;
                    $labelAttributes[$value] = $labelVal;
                }
                $formatPrice = number_format($product->getPrice(), 2, '.', '');
                $productAdd = [
                    'entity_id' => $product->getId(),
                    'sku' => $product->getSku(),
                    'name' => $product->getName(),
                    'src' => $this->imageHelper->init($product, 'product_base_image')->getUrl(),
                    'price' => $formatPrice,
                    'super_attributes' => $attributes,
                    'label_super_attributes' => $labelAttributes,
                    'qty' => 1,
                    'total' => $formatPrice,
                    'is_check' => false,
                ];
                array_push($productData, $productAdd);
            }

            try {
                return $this->jsonResponse($productData);
            } catch (\Magento\Framework\Exception\LocalizedException $e) {
                return $this->jsonResponse($e->getMessage());
            } catch (\Exception $e) {
                $this->logger->critical($e);
                return $this->jsonResponse($e->getMessage());
            }
        }
    }

    /**
     * Create json response
     *
     * @return \Magento\Framework\Controller\ResultInterface
     */
    public function jsonResponse($response = '')
    {
        return $this->getResponse()->representJson(
            $this->jsonHelper->jsonEncode($response)
        );
    }

    protected function getSuperAttributeData($id)
    {
        /** @var \Magento\Catalog\Model\Product $product */
        $product = $this->_productRepository->getById($id);
        if ($product->getTypeId() != \Magento\ConfigurableProduct\Model\Product\Type\Configurable::TYPE_CODE) {
            return [];
        }

        /** @var \Magento\ConfigurableProduct\Model\Product\Type\Configurable $productTypeInstance */
        $productTypeInstance = $product->getTypeInstance();
        $productTypeInstance->setStoreFilter($product->getStoreId(), $product);

        $attributes = $productTypeInstance->getConfigurableAttributes($product);
        $superAttributeList = [];
        foreach ($attributes as $_attribute) {
            $attributeCode = $_attribute->getProductAttribute()->getAttributeCode();;
            $superAttributeList[$_attribute->getAttributeId()] = $attributeCode;
        }
        return $superAttributeList;
    }
}
