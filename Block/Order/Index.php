<?php

/**
 * Copyright ©  All rights reserved.
 * See COPYING.txt for license details.
 */

declare(strict_types=1);

namespace AHT\FastOrder\Block\Order;

class Index extends \Magento\Framework\View\Element\Template
{

    /**
     * @var array|\Magento\Checkout\Block\Checkout\LayoutProcessorInterface[]
     */
    protected $layoutProcessors;

    public function __construct(
        \Magento\Framework\View\Element\Template\Context $context,
        array $layoutProcessors = [],
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->jsLayout = isset($data['jsLayout']) && is_array($data['jsLayout']) ? $data['jsLayout'] : [];
        $this->layoutProcessors = $layoutProcessors;
    }

    public function getJsLayout()
    {
        foreach ($this->layoutProcessors as $processor) {
            $this->jsLayout = $processor->process($this->jsLayout);
        }
        return \Zend_Json::encode($this->jsLayout);
    }
}
